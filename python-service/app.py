import os
import json
import warnings
import traceback
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

import whisper
import librosa
import cv2
import mediapipe as mp

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

print("Loading Whisper Model...")
try:
    whisper_model = whisper.load_model("base")
    print("Whisper Model Loaded.")
except Exception as e:
    print(f"Error loading whisper: {e}")
    whisper_model = None


def analyze_confidence(y, sr, text):
    """Estimate confidence score from audio features."""
    try:
        # Energy / volume consistency
        rms = librosa.feature.rms(y=y)[0]
        rms_mean = float(np.mean(rms))
        rms_std  = float(np.std(rms))

        # Pitch variation (high variation = dynamic/confident speech)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_vals = pitches[magnitudes > np.median(magnitudes)]
        pitch_std = float(np.std(pitch_vals)) if len(pitch_vals) > 0 else 0

        # Speaking rate
        word_count = len(text.split()) if text else 0
        duration   = librosa.get_duration(y=y, sr=sr)
        wpm = word_count / (duration / 60) if duration > 0 else 0

        # Silence ratio
        intervals = librosa.effects.split(y, top_db=20)
        non_silent = sum([(e - s) / sr for s, e in intervals])
        silence_ratio = 1 - (non_silent / duration) if duration > 0 else 1

        # Score components (each 0-10)
        energy_score  = min(10, rms_mean * 1000)          # higher energy = more confident
        pitch_score   = min(10, pitch_std / 50)            # more variation = expressive
        rate_score    = 10 if 110 <= wpm <= 160 else 6 if 80 <= wpm <= 180 else 3
        silence_score = 10 if silence_ratio < 0.2 else 7 if silence_ratio < 0.35 else 4

        confidence = int((energy_score * 0.3 + pitch_score * 0.3 + rate_score * 0.2 + silence_score * 0.2))
        return max(1, min(10, confidence))
    except Exception as e:
        print(f"Confidence analysis error: {e}")
        return 5


@app.route('/process_video', methods=['POST'])
def process_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    video_file = request.files['video']
    file_path  = "temp_video.webm"
    video_file.save(file_path)

    try:
        # 1. Speech-to-Text
        print("Starting Whisper transcription...")
        text = ""
        if whisper_model:
            result = whisper_model.transcribe(file_path, language='en')
            text   = result.get("text", "").strip()
        print(f"Transcription: {text}")

        # 2. Voice + Confidence Analysis
        print("Starting Voice/Confidence Analysis...")
        y, sr    = librosa.load(file_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)

        word_count  = len(text.split())
        wpm         = word_count / (duration / 60) if duration > 0 else 0
        intervals   = librosa.effects.split(y, top_db=20)
        non_silent  = sum([(e - s) / sr for s, e in intervals])
        silence_ratio = (duration - non_silent) / duration if duration > 0 else 0

        voice_score = 10
        if wpm < 110 or wpm > 170: voice_score -= 2
        if silence_ratio > 0.3:    voice_score -= 2
        voice_score = max(1, min(10, voice_score))

        confidence_score = analyze_confidence(y, sr, text)

        # 3. Facial Analysis
        print("Starting Facial Analysis...")
        cap           = cv2.VideoCapture(file_path)
        total_checked = 0
        faces_detected= 0
        frame_count   = 0
        face_score    = 0

        try:
            from mediapipe.tasks.python import vision
            from mediapipe.tasks.python import BaseOptions

            model_path = 'face_landmarker.task'
            if not os.path.exists(model_path):
                import urllib.request
                print("Downloading face_landmarker.task...")
                urllib.request.urlretrieve(
                    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    model_path
                )

            base_options = BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
                num_faces=1
            )

            with vision.FaceLandmarker.create_from_options(options) as landmarker:
                from mediapipe import Image, ImageFormat
                while cap.isOpened():
                    success, frame = cap.read()
                    if not success: break
                    frame_count += 1
                    if frame_count % 5 != 0: continue
                    total_checked += 1
                    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    mp_image  = Image(image_format=ImageFormat.SRGB, data=image_rgb)
                    detection_result = landmarker.detect(mp_image)
                    if len(detection_result.face_landmarks) > 0:
                        faces_detected += 1

            ratio = faces_detected / total_checked if total_checked > 0 else 0
            face_score = 9 if ratio > 0.7 else 7 if ratio > 0.4 else 5 if ratio > 0.2 else 2

        except Exception as e:
            print(f"Face analysis error: {e}")
            traceback.print_exc()
            face_score = 0
        finally:
            cap.release()

        face_feedback = 'Good eye contact!' if face_score >= 8 else 'Try to maintain eye contact with the camera.'

        print(f"Done. Voice:{voice_score} Face:{face_score} Confidence:{confidence_score}")

        return jsonify({
            'text':            text,
            'voiceScore':      int(voice_score),
            'faceScore':       int(face_score),
            'faceFeedback':    face_feedback,
            'confidenceScore': int(confidence_score)
        })

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Cleanup error: {e}")


if __name__ == '__main__':
    app.run(port=5001, debug=True)
