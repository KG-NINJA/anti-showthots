# Monocular Collision Warning

スマホの単眼カメラだけを使い、物体との距離を推定して「ぶつかりそうなときに警告を出す」仕組みのプロトタイプです。

## 概要

- 単眼カメラ映像から物体の距離を推定
- 相対速度と距離から **Time to Collision (TTC)** を計算
- 一定の閾値以下になれば警告を発出（音・バイブ・画面表示）

## 技術要素

1. **物体検出**
   - YOLO / SSD など軽量なモデルで物体を検出

2. **距離推定**
   - 幾何学的推定（カメラパラメータ + 物体の既知サイズ）
   - もしくは深度推定モデル（MonoDepth 系）

3. **衝突判定**
   - 連続フレームから距離変化を追跡し相対速度を推定
   - Time-to-Collision (TTC) < 閾値 → 警告

## 想定される制約

- 単眼カメラは距離推定に誤差が多い
- 光量不足や逆光などでは性能低下
- 計算コストが高いためスマホ実機では軽量化が必須

## 実行方法

```bash
git clone https://github.com/yourname/monocular-collision-warning.git
cd monocular-collision-warning
pip install -r requirements.txt
python app.py
