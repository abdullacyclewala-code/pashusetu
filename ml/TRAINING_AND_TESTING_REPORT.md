# PashuSetu image models — training and testing report

**Report date:** 5 September 2026  
**Status:** Experimental, non-diagnostic visual screening

## Executive summary

Two reproducible cattle image models were trained. Version 2 is used by the web application because it adds an FMD-like class and improves LSD-like recall on its held-out dataset. Both are lightweight SqueezeNet transfer-learning models exported to ONNX for local browser inference. Neither has prospective clinical validation.

| Model | Labelled images after quarantine | Classes | Held-out test | Accuracy | Balanced accuracy | AUC |
|---|---:|---|---:|---:|---:|---:|
| v1 | 1,011 | Healthy, LSD | 203 | 0.847 | 0.763 | 0.963 ROC |
| v2 (active) | 3,240 | Healthy, LSD, FMD | 648 | 0.855 | 0.862 | 0.962 macro OVR ROC |

## Active v2 dataset

Source: [Kaggle cattle diseases dataset](https://www.kaggle.com/datasets/devang03mgr/cattle-diseases-datasets). The dataset page identifies the licence as ODC Database Contents License 1.0. Downloaded archive SHA-256: `cee2fc7c03c645e72a5ea5107bc1d6fe5ada55834baa0e1fc4193df36a684e84`.

Published contents were 746 FMD-labelled, 1,291 healthy-labelled, and 1,207 LSD-labelled files. All 3,244 files decoded. A pHash audit at Hamming distance ≤4 found two cross-label near-duplicate groups containing four images; all four were quarantined. Remaining perceptual groups were kept wholly within one split.

The dataset has material quality limitations: incomplete original image provenance, heterogeneous web imagery, watermarks/text, illustrations in the healthy folder, and non-cattle or ambiguous examples in the FMD folder. Filename patterns also suggest prior Roboflow processing. pHash does not guarantee that every transformed augmentation was grouped.

## Method

1. Centre crop and resize to 224×224 RGB.
2. ImageNet mean/standard-deviation normalization.
3. ImageNet-pretrained SqueezeNet 1.0 feature extractor.
4. Global average pooling to 512 features.
5. Class-balanced, L2-regularised multinomial logistic head.
6. Seeded stratified group split: 2,073 train, 519 validation, 648 held-out test.
7. ONNX export and ONNX Runtime validation.

The active product applies an additional abstention rule: the leading class must have probability ≥0.75 and exceed the runner-up by ≥0.20. Otherwise the result is **inconclusive**. This product gate was chosen conservatively; it is not a clinically calibrated threshold.

## v2 held-out results

| Actual class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| FMD-like | 0.812 | 0.899 | 0.854 | 149 |
| Healthy-like | 0.873 | 0.802 | 0.836 | 258 |
| LSD-like | 0.866 | 0.884 | 0.875 | 241 |

Confusion matrix, rows actual and columns predicted, ordered FMD / healthy / LSD:

```text
[[134, 10,  5],
 [ 23,207, 28],
 [  8, 20,213]]
```

Validation accuracy was 0.892, validation balanced accuracy 0.912, and validation macro OVR AUC 0.981. The lower held-out performance is reported as the primary estimate.

## v1 held-out results

The v1 source is Kumar and Shastri, *Lumpy Skin Images Dataset*, Mendeley Data v1, DOI `10.17632/w36hpf86j2.1`, CC BY 4.0. Thirteen images in five cross-label pHash groups were quarantined. Split: 650 train, 158 validation, 203 test.

| Actual class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| Healthy | 0.826 | 0.986 | 0.899 | 140 |
| LSD-like | 0.944 | 0.540 | 0.687 | 63 |

## Current web pipeline

1. Farmer selects or captures a report photo.
2. The active v2 ONNX model runs locally through ONNX Runtime Web/WASM; the image is not sent to a model server.
3. The user sees all three probabilities and a normal/LSD/FMD/inconclusive interpretation.
4. The report, compressed photo, and structured `image_model` result enter the crash-safe IndexedDB queue.
5. Sync uploads the report/photo idempotently and calls an ownership-validating database RPC to store the image result as a separate `triage_results` row with `source='image_model'`.
6. The existing server-side rule engine independently scores the symptom report across its larger disease knowledge base and stores `source='rule_engine'`.
7. A combined presentation compares the two outputs:
   - agreement is described as stronger screening evidence, never confirmation;
   - disagreement requests veterinary review;
   - a normal image never rules out symptomatic disease;
   - an inconclusive image leaves symptoms as the useful signal.
8. Rule-engine urgency remains authoritative. Image inference can never overwrite or lower it.

## Reproduction and artifacts

- v2 training: `ml/train_cattle_multiclass.py`
- v2 exact metrics: `ml/model_metrics_v2.json`
- v2 duplicate audit: `ml/multiclass_audit.json`
- v2 model card: `ml/MODEL_CARD_V2.md`
- v2 ONNX: `public/models/cattle-skin-v2.onnx`
- v1 training: `ml/train_lsd_screen.py`
- v1 exact metrics: `ml/model_metrics.json`
- v1 model card: `ml/MODEL_CARD.md`
- Browser inference: `lib/image-model/infer.ts`
- Secure persistence migration: `supabase/migrations/0015_image_model_pipeline.sql`

## Required validation before operational reliance

- Independent veterinary review and relabelling of questionable source images.
- Animal/farm/session-level split using provenance unavailable in the current datasets.
- External prospective testing on Maharashtra cattle and buffalo under real phone-camera conditions.
- Calibration and abstention evaluation on field data.
- Tests against unsupported diseases and non-animal/out-of-distribution photographs.

Until then, all outputs must remain explicitly non-diagnostic screening aids.
