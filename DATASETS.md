# Datasets

Aegis-Edge fuses **real, already-collected sensor modalities** — the kinds of data a military C-UAS
site already produces — rather than requiring any new sensor or data pipeline. The tactical *scenario*
in the 3D demo is synthetic and labeled as such; the **modalities below are real corpora.**

| Modality | Dataset | Role in Aegis-Edge |
|---|---|---|
| **RF detection** | DroneRF — UAV RF Signal Dataset | Small-UAS RF signatures (drone vs. background) for the RF-sensing modality. |
| **Thermal / EO-IR** | HIT-UAV — high-altitude infrared thermal | Real infrared imagery for the electro-optical / thermal UAV-detection modality. |
| **Cooperative discrimination** | ADS-B (adsb.lol) + OpenSky ADS-B state vectors | Real cooperative-aircraft tracks — a valid transponder is held **COOPERATIVE** and hard-blocked from engagement (the < 0.1% false-positive guarantee). |
| **Cross-unit linking** | MITRE Cursor-on-Target (CoT) | The DoD standard for sharing time-sensitive track/position data **between units** — the interoperability layer behind the Link-16 fusion story. |
| **Real threat data** | Massive Missile Attacks on Ukraine | Real launched / shot-down UAV strike records — grounds the threat side in current, real-world engagements. |

## How the data is used
- **Tracking** — a real **IMM (Interacting Multiple Model)** estimator runs over real drone-trajectory
  telemetry; it predicts motion and closest-point-of-approach.
- **Optical modality** — a **trained image classifier** on real thermal / bird-vs-drone imagery.
- **Cooperative discrimination** — real ADS-B / Remote-ID tracks drive the friend-or-foe hard-block.
- **Engagement classification** — a **deterministic, weighted-feature** classifier (transparent rules,
  not a trained black box) — chosen for explainability and accreditability.

## Honesty note (say it this way)
> The tracker and the modalities are validated on **real corpora**; the tactical **scenario is synthetic**.
> We do **not** claim an end-to-end model trained on all datasets — the RF/thermal/ADS-B corpora validate
> the respective modalities, the optical model is trained, the tracker is a statistical estimator, and the
> engagement classification is deterministic rules.

## Fetching (reproducibility)
Datasets are pulled on demand and never committed. With the Kaggle CLI authenticated:
```bash
kaggle datasets download -d shawnwuplus/drone-trajectory-data --unzip -p datasets/raw
kaggle datasets download -d stealthknight/bird-vs-drone --unzip -p datasets/raw
# plus the hackathon-portal datasets above (DroneRF, HIT-UAV, ADS-B, CoT, Ukraine)
```
