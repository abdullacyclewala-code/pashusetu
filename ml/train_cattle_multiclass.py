#!/usr/bin/env python3
"""Train the three-way cattle visual-screen model from the audited Kaggle dataset.

Data source: https://www.kaggle.com/datasets/devang03mgr/cattle-diseases-datasets
Licence shown by Kaggle: ODC Database Contents License 1.0.
Classes are healthy, lumpy, and foot-and-mouth. Outputs are visual similarities,
not diagnoses. Perceptual duplicate groups are quarantined across conflicting
labels and kept within one split otherwise.
"""
from __future__ import annotations
import argparse,json,hashlib
from collections import Counter,defaultdict
from pathlib import Path
import cv2,imagehash,numpy as np,onnx,onnxruntime as ort
from PIL import Image
from onnx import TensorProto,helper,numpy_helper
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score,balanced_accuracy_score,classification_report,confusion_matrix,roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
SEED=260905; CLASSES=['foot-and-mouth','healthy','lumpy']; MEAN=np.array([.485,.456,.406],np.float32);STD=np.array([.229,.224,.225],np.float32)
def prep(p):
 im=cv2.cvtColor(cv2.imread(str(p)),cv2.COLOR_BGR2RGB);h,w=im.shape[:2];s=256/min(h,w);im=cv2.resize(im,(round(w*s),round(h*s)),interpolation=cv2.INTER_AREA);h,w=im.shape[:2];im=im[(h-224)//2:(h-224)//2+224,(w-224)//2:(w-224)//2+224].astype(np.float32)/255;return np.transpose((im-MEAN)/STD,(2,0,1))[None]
def rows(root):return [(p,i) for i,c in enumerate(CLASSES) for p in sorted((root/c).glob('*'))]
def groups_and_conflicts(rs):
 hs=[imagehash.phash(Image.open(p).convert('RGB')) for p,_ in rs];par=list(range(len(rs)))
 def f(x):
  while par[x]!=x:par[x]=par[par[x]];x=par[x]
  return x
 def u(a,b):
  a,b=f(a),f(b)
  if a!=b:par[b]=a
 for i in range(len(rs)):
  for j in range(i):
   if hs[i]-hs[j]<=4:u(i,j)
 gs=np.array([f(i) for i in range(len(rs))]);y=np.array([y for _,y in rs]);bad=[g for g in set(gs) if len(set(y[gs==g]))>1];return gs,bad
def feature_model(src,dst):
 m=onnx.load(src);m.graph.output.clear();m.graph.output.append(helper.make_tensor_value_info('fire9/concat_1',TensorProto.FLOAT,[1,512,13,13]));onnx.save(m,dst)
def export(src,clf,out):
 m=onnx.load(src);keep=[]
 for n in m.graph.node:
  keep.append(n)
  if 'fire9/concat_1' in n.output:break
 del m.graph.node[:];m.graph.node.extend(keep);m.graph.output.clear()
 m.graph.node.extend([helper.make_node('GlobalAveragePool',['fire9/concat_1'],['gap']),helper.make_node('Flatten',['gap'],['features'],axis=1),helper.make_node('Gemm',['features','W','b'],['logits']),helper.make_node('Softmax',['logits'],['class_probabilities'],axis=1)])
 m.graph.initializer.extend([numpy_helper.from_array(clf.coef_.astype(np.float32).T,'W'),numpy_helper.from_array(clf.intercept_.astype(np.float32),'b')]);m.graph.output.append(helper.make_tensor_value_info('class_probabilities',TensorProto.FLOAT,[1,3]));m.doc_string='PashuSetu non-diagnostic cattle visual screening v2; see ml/MODEL_CARD_V2.md';onnx.checker.check_model(m);onnx.save(m,out)
def main():
 a=argparse.ArgumentParser();a.add_argument('--data',type=Path,required=True);a.add_argument('--backbone',type=Path,required=True);a.add_argument('--out',type=Path,default=Path('public/models/cattle-skin-v2.onnx'));z=a.parse_args();rs=rows(z.data);y=np.array([q for _,q in rs]);gs,bad=groups_and_conflicts(rs);quarantine=np.isin(gs,bad);rs=[r for r,k in zip(rs,~quarantine) if k];y=y[~quarantine];gs=gs[~quarantine]
 outer=StratifiedGroupKFold(5,shuffle=True,random_state=SEED);tv,te=next(outer.split(np.zeros(len(y)),y,gs));inner=StratifiedGroupKFold(5,shuffle=True,random_state=SEED+1);aa,va=next(inner.split(np.zeros(len(tv)),y[tv],gs[tv]));tr=tv[aa]
 fm=Path('/tmp/multiclass_features.onnx');feature_model(z.backbone,fm);s=ort.InferenceSession(str(fm));name=s.get_inputs()[0].name;X=np.empty((len(rs),512),np.float32)
 for i,(p,_) in enumerate(rs):X[i]=s.run(None,{name:prep(p)})[0].mean((2,3))[0]
 clf=LogisticRegression(C=.1,class_weight='balanced',max_iter=3000,random_state=SEED).fit(X[tr],y[tr]);vp=clf.predict_proba(X[va]);tp=clf.predict_proba(X[te]);pred=tp.argmax(1);z.out.parent.mkdir(parents=True,exist_ok=True);export(z.backbone,clf,z.out)
 rep={'schema_version':2,'seed':SEED,'dataset':{'url':'https://www.kaggle.com/datasets/devang03mgr/cattle-diseases-datasets','license':'ODC Database Contents License 1.0','archive_sha256':'cee2fc7c03c645e72a5ea5107bc1d6fe5ada55834baa0e1fc4193df36a684e84','classes':dict(Counter(CLASSES[q] for q in y))},'audit':{'phash_distance':4,'cross_label_groups':len(bad),'quarantined_images':int(quarantine.sum())},'split':{'train':len(tr),'validation':len(va),'test':len(te)},'validation':{'accuracy':accuracy_score(y[va],vp.argmax(1)),'balanced_accuracy':balanced_accuracy_score(y[va],vp.argmax(1)),'macro_roc_auc_ovr':roc_auc_score(y[va],vp,multi_class='ovr',average='macro')},'test':{'accuracy':accuracy_score(y[te],pred),'balanced_accuracy':balanced_accuracy_score(y[te],pred),'macro_roc_auc_ovr':roc_auc_score(y[te],tp,multi_class='ovr',average='macro'),'confusion_matrix':confusion_matrix(y[te],pred).tolist(),'classes':classification_report(y[te],pred,target_names=CLASSES,output_dict=True,zero_division=0)}}
 rep=json.loads(json.dumps(rep,default=lambda x:float(x) if isinstance(x,np.floating) else int(x)));Path('ml/model_metrics_v2.json').write_text(json.dumps(rep,indent=2)+'\n');print(json.dumps(rep,indent=2))
if __name__=='__main__':main()
