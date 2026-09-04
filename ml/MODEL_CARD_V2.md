# PashuSetu cattle visual screen v2

## Scope

A non-diagnostic, on-device three-way visual similarity screen: **normal-appearing**, **LSD-like**, and **FMD-like**. It returns **inconclusive** unless the leading probability is at least 0.75 and exceeds the runner-up by at least 0.20. “FMD-like” refers to visible patterns in the dataset, commonly mouth/foot lesions; FMD cannot be diagnosed from a photograph.

## Dataset

- Kaggle: `devang03mgr/cattle-diseases-datasets`, downloaded 5 September 2026.
- Dataset page licence: ODC Database Contents License 1.0.
- Archive SHA-256: `cee2fc7c03c645e72a5ea5107bc1d6fe5ada55834baa0e1fc4193df36a684e84`.
- Published folders: 746 foot-and-mouth, 1,291 healthy, 1,207 lumpy (3,244 files).
- Four images in two cross-label near-duplicate groups were quarantined, leaving 3,240 images.

The dataset card does not document original image-level provenance, animal identity, farm, geography, veterinary confirmation, or collection protocol. Visual review found heterogeneous web imagery, text/watermarks, illustrations in the healthy class, and some non-cattle/ambiguous examples in the FMD class. These are significant limitations and may create shortcut learning. The model is therefore presented only as an experimental visual screen.

## Leakage controls

All images were decoded successfully. SHA-256 and perceptual-hash auditing used pHash Hamming distance ≤4. Cross-label groups were removed. Remaining perceptual groups were assigned wholly to one stratified split. The split contains 2,073 training, 519 validation and 648 held-out test images.

Filename suffixes suggest that some files originated in Roboflow exports. pHash catches identical and very similar copies but may not group every strong crop, rotation, colour transformation, or augmentation. Reported results may therefore remain optimistic.

## Model

ImageNet-pretrained SqueezeNet 1.0 feature extractor, global average pooling and a class-balanced L2-regularised multinomial logistic head. Input: centre-cropped 224×224 RGB with ImageNet normalization. Export: ONNX, approximately 4.8 MB. Inference runs locally using ONNX Runtime Web/WASM.

## Held-out test results

648 images: 149 FMD-labelled, 258 healthy-labelled and 241 LSD-labelled.

| Class | Precision | Recall | F1 |
|---|---:|---:|---:|
| FMD-like | 0.812 | 0.899 | 0.854 |
| Healthy-like | 0.873 | 0.802 | 0.836 |
| LSD-like | 0.866 | 0.884 | 0.875 |

- Accuracy: 0.855
- Balanced accuracy: 0.862
- Macro one-vs-rest ROC AUC: 0.962
- Confusion matrix, rows/columns ordered FMD, healthy, LSD: `[[134,10,5],[23,207,28],[8,20,213]]`

These metrics describe dataset-label prediction before the product’s inconclusive gate. They are not clinical sensitivity/specificity and do not establish field performance.

## Safety and unsupported conditions

The image result never overwrites or lowers symptom-rule urgency. Ringworm, dermatophilosis, pediculosis, mange, mastitis and other conditions remain unsupported because accessible datasets were too small, unclear, or unavailable under reproducible terms. External prospective validation by veterinarians in Maharashtra is required before clinical or operational reliance.

## Reproduction

Training pipeline: `ml/train_cattle_multiclass.py`. Exact machine-readable metrics: `ml/model_metrics_v2.json`. Dataset audit: `ml/multiclass_audit.json`.
