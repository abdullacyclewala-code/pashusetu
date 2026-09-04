# PashuSetu cattle skin visual screen v1

## Intended use

A non-diagnostic, on-device visual screen for cattle/buffalo report photos. It estimates whether an image resembles the **LSD-labelled** or **healthy-labelled** cattle images in the training data. It does not confirm lumpy skin disease and does not replace veterinary examination or laboratory testing. The output is kept separate from PashuSetu's symptom rule engine (`source: image_model`).

## Data provenance and licence

- Sachin Kumar and Sourabh Shastri (2022), *Lumpy Skin Images Dataset*, Mendeley Data v1.
- DOI: https://doi.org/10.17632/w36hpf86j2.1
- Licence: Creative Commons Attribution 4.0 (CC BY 4.0).
- Published counts: 700 normal-skin and 324 lumpy-skin PNG images, resized to 256×256.
- Downloaded outer archive SHA-256: `22d35ca56972e7da4f0c8391c72f7a1117d624452ca1b61f655ad2e92f6bbba0`.

## Audit and split

Perceptual hashes (pHash, Hamming distance ≤4) were grouped before splitting. Five groups (13 images) contained near-duplicates across opposing labels and were quarantined. The remaining 1,011 images included 108 within-label duplicate images above unique group count. A seeded stratified group split produced 650 training, 158 validation and 203 held-out test images. Thus near-duplicate groups cannot cross splits.

This audit reduces obvious leakage but cannot establish that the original images came from independent animals, farms, capture sessions, or web sources; those identifiers are not supplied.

## Model

ImageNet-pretrained SqueezeNet 1.0 feature extractor followed by global average pooling and a class-balanced, L2-regularised logistic head trained on this dataset. Input is a centre-cropped 224×224 RGB image with ImageNet normalisation. Export: ONNX, 4.8 MB.

The high-confidence LSD-like threshold (`p ≥ 0.89`) was selected using validation balanced accuracy only. `p ≤ 0.20` is shown as normal-appearing. Values between these limits are deliberately **inconclusive**. The normal cutoff is a conservative product policy boundary, not a clinically validated threshold.

## Held-out test results

203 images: 140 healthy, 63 LSD-labelled.

| Class | Precision | Recall | F1 |
|---|---:|---:|---:|
| Healthy | 0.826 | 0.986 | 0.899 |
| LSD-like | 0.944 | 0.540 | 0.687 |

- Accuracy: 0.847
- Balanced accuracy: 0.763
- ROC AUC: 0.963
- Confusion matrix (`actual healthy, actual LSD` rows): `[[138, 2], [29, 34]]`

The operating point prioritises avoiding false LSD alerts, at the cost of missing many LSD-labelled images. Therefore an apparently normal visual result must never downgrade symptom urgency.

## Unsupported claims and limitations

- This version does **not** distinguish ringworm, dermatophilosis, mange, FMD, mastitis, ticks, trauma, or other diseases. No defensible multiclass dataset was incorporated.
- “Abnormal” currently means high LSD-like similarity only; it is not a general detector for every abnormal skin condition.
- Dataset geography, animal identity, breed distribution, camera distribution, and collection protocol are insufficiently documented. Performance in Maharashtra field conditions is unknown.
- Centre crops may omit lesions. Blur, distance, occlusion, mud, markings, lighting and non-skin content can invalidate the result.
- Test images originate from the same published dataset as training images. External, prospective veterinary validation is still required.

## Reproduction

Run `ml/train_lsd_screen.py` with the extracted Mendeley folders and the documented SqueezeNet ONNX backbone. The exact split seed and metrics are in `ml/model_metrics.json`.
