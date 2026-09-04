#!/usr/bin/env python3
"""Train and export PashuSetu's binary cattle skin-screening model.

Dataset: Kumar & Shastri, Lumpy Skin Images Dataset v1 (CC BY 4.0),
DOI 10.17632/w36hpf86j2.1. This script intentionally groups perceptual
near-duplicates before making a stratified train/validation/test split.

The model is an ImageNet-pretrained SqueezeNet 1.0 feature extractor plus a
regularised logistic head. Only the head is fitted. The resulting ONNX graph
accepts float32 RGB NCHW [1,3,224,224], ImageNet-normalised, and emits one
LSD-like probability. It is a non-diagnostic visual screen, not a diagnosis.
"""
from __future__ import annotations
import argparse, hashlib, json, random
from collections import Counter, defaultdict
from pathlib import Path

import cv2, imagehash, numpy as np, onnx, onnxruntime as ort
from PIL import Image
from onnx import TensorProto, helper, numpy_helper, shape_inference
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, balanced_accuracy_score,
    confusion_matrix, precision_recall_fscore_support, roc_auc_score)
from sklearn.model_selection import StratifiedGroupKFold

SEED=260905
MEAN=np.array([0.485,0.456,0.406],np.float32)
STD=np.array([0.229,0.224,0.225],np.float32)

def files(root: Path):
    rows=[]
    for label,folder in [(0,'Normal Skin'),(1,'Lumpy Skin')]:
        rows += [(p,label) for p in sorted((root/folder).glob('*')) if p.is_file()]
    return rows

def phash_groups(rows, max_distance=4):
    # Conservative union-find near-duplicate grouping. O(n²) is acceptable for 1,024 images.
    hs=[imagehash.phash(Image.open(p).convert('RGB')) for p,_ in rows]
    parent=list(range(len(rows)))
    def find(x):
        while parent[x]!=x: parent[x]=parent[parent[x]]; x=parent[x]
        return x
    def union(a,b):
        a,b=find(a),find(b)
        if a!=b: parent[b]=a
    for i in range(len(rows)):
        for j in range(i):
            if hs[i]-hs[j] <= max_distance: union(i,j)
    return np.array([find(i) for i in range(len(rows))]), hs

def prep(path):
    im=cv2.cvtColor(cv2.imread(str(path)),cv2.COLOR_BGR2RGB)
    h,w=im.shape[:2]; scale=256/min(h,w)
    im=cv2.resize(im,(round(w*scale),round(h*scale)),interpolation=cv2.INTER_AREA)
    h,w=im.shape[:2]; y=(h-224)//2; x=(w-224)//2
    im=im[y:y+224,x:x+224].astype(np.float32)/255
    im=(im-MEAN)/STD
    return np.transpose(im,(2,0,1))[None]

def feature_model(src, dst):
    m=onnx.load(src)
    m.graph.output.clear(); m.graph.output.append(helper.make_tensor_value_info('fire9/concat_1',TensorProto.FLOAT,[1,512,13,13]))
    onnx.save(m,dst)

def split(y,groups):
    outer=StratifiedGroupKFold(n_splits=5,shuffle=True,random_state=SEED)
    trainval,test=next(outer.split(np.zeros(len(y)),y,groups))
    inner=StratifiedGroupKFold(n_splits=5,shuffle=True,random_state=SEED+1)
    tr0,val0=next(inner.split(np.zeros(len(trainval)),y[trainval],groups[trainval]))
    return trainval[tr0],trainval[val0],test

def metrics(y,p,threshold):
    pred=(p>=threshold).astype(int); pr,rc,f1,sup=precision_recall_fscore_support(y,pred,labels=[0,1],zero_division=0)
    return {'n':len(y),'accuracy':accuracy_score(y,pred),'balanced_accuracy':balanced_accuracy_score(y,pred),
      'roc_auc':roc_auc_score(y,p),'confusion_matrix':confusion_matrix(y,pred,labels=[0,1]).tolist(),
      'classes':{'healthy':{'precision':pr[0],'recall':rc[0],'f1':f1[0],'support':int(sup[0])},
                 'lsd_like':{'precision':pr[1],'recall':rc[1],'f1':f1[1],'support':int(sup[1])}}}

def export(backbone,clf,out):
    m=onnx.load(backbone)
    # Remove ImageNet classifier and retain nodes through fire9 concat.
    keep=[]
    for n in m.graph.node:
        keep.append(n)
        if 'fire9/concat_1' in n.output: break
    del m.graph.node[:]; m.graph.node.extend(keep)
    m.graph.output.clear()
    gap=helper.make_node('GlobalAveragePool',['fire9/concat_1'],['skin_gap'],name='skin_global_average')
    flat=helper.make_node('Flatten',['skin_gap'],['skin_features'],axis=1,name='skin_flatten')
    gemm=helper.make_node('Gemm',['skin_features','skin_W','skin_b'],['skin_logit'],name='skin_logistic_head')
    sig=helper.make_node('Sigmoid',['skin_logit'],['lsd_like_probability'],name='skin_probability')
    m.graph.node.extend([gap,flat,gemm,sig])
    W=clf.coef_.astype(np.float32).T; b=clf.intercept_.astype(np.float32)
    m.graph.initializer.extend([numpy_helper.from_array(W,'skin_W'),numpy_helper.from_array(b,'skin_b')])
    m.graph.output.append(helper.make_tensor_value_info('lsd_like_probability',TensorProto.FLOAT,[1,1]))
    m.doc_string='PashuSetu non-diagnostic LSD-like visual screening model; CC BY 4.0 training data; see MODEL_CARD.md.'
    onnx.checker.check_model(m); onnx.save(m,out)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--data',type=Path,required=True); ap.add_argument('--backbone',type=Path,required=True); ap.add_argument('--out',type=Path,default=Path('public/models/cattle-skin-lsd-v1.onnx')); args=ap.parse_args()
    random.seed(SEED); np.random.seed(SEED); rows=files(args.data); y=np.array([x[1] for x in rows]); groups,hashes=phash_groups(rows)
    conflict=[]
    for g in set(groups):
        labs=set(y[groups==g]);
        if len(labs)>1: conflict.append(int(g))
    # Conflicting near-duplicates cannot safely teach or evaluate the model.
    # Quarantine every image in those groups and disclose the count.
    quarantined=int(np.isin(groups,conflict).sum())
    if conflict:
        keep=~np.isin(groups,conflict)
        rows=[r for r,k in zip(rows,keep) if k]; y=y[keep]; groups=groups[keep]
    tr,va,te=split(y,groups)
    tmp=Path('/tmp/skin_features.onnx'); feature_model(args.backbone,tmp)
    sess=ort.InferenceSession(str(tmp),providers=['CPUExecutionProvider']); inp=sess.get_inputs()[0].name
    X=np.empty((len(rows),512),np.float32)
    for i,(p,_) in enumerate(rows): X[i]=sess.run(None,{inp:prep(p)})[0].mean(axis=(2,3))[0]
    clf=LogisticRegression(C=0.1,class_weight='balanced',max_iter=3000,random_state=SEED).fit(X[tr],y[tr])
    vp=clf.predict_proba(X[va])[:,1]
    # Threshold selected on validation only: maximise balanced accuracy.
    candidates=np.linspace(.1,.9,161); threshold=float(max(candidates,key=lambda t: balanced_accuracy_score(y[va],vp>=t)))
    tp=clf.predict_proba(X[te])[:,1]
    args.out.parent.mkdir(parents=True,exist_ok=True); export(args.backbone,clf,args.out)
    report={'schema_version':1,'seed':SEED,'dataset':{'doi':'10.17632/w36hpf86j2.1','license':'CC BY 4.0','sha256_outer_zip':'22d35ca56972e7da4f0c8391c72f7a1117d624452ca1b61f655ad2e92f6bbba0','counts':dict(Counter('lsd_like' if z else 'healthy' for z in y))},'audit':{'phash_distance':4,'duplicate_groups':int(len(rows)-len(set(groups))),'cross_label_groups':len(conflict),'quarantined_images':quarantined},'split':{'train':len(tr),'validation':len(va),'test':len(te),'grouped':True},'threshold':threshold,'inconclusive_band':[max(0,threshold-.15),min(1,threshold+.15)],'validation':metrics(y[va],vp,threshold),'test':metrics(y[te],tp,threshold)}
    report=json.loads(json.dumps(report,default=lambda x: float(x) if isinstance(x,np.floating) else int(x)))
    Path('ml/model_metrics.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))
if __name__=='__main__': main()
