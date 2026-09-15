# whisper_script.py
import sys
import whisper
import json

def transcribir(audio_path):
    try:
        model = whisper.load_model("base")
        result = model.transcribe(audio_path, language="Spanish")
        print(result["text"])
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR: No se proporcionó ruta de audio", file=sys.stderr)
        sys.exit(1)
    
    transcribir(sys.argv[1])