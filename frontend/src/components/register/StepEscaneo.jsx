import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Button } from 'react-bootstrap';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const clasificarError = (mensaje = '') => {
  if (mensaje.includes('no pertenece a ESCOM') || mensaje.includes('no es de Ingeniería')) {
    return 'rejected';
  }
  if (mensaje.includes('no coincide')) {
    return 'mismatch';
  }
  if (mensaje.includes('verificar tu identidad nuevamente') || mensaje.includes('inválido o expirado')) {
    return 'expired';
  }
  return 'error';
};

const StepEscaneo = ({ formData, updateField, onBack, onNext }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [mode, setMode] = useState('camera'); // camera | upload
  const [status, setStatus] = useState('scanning'); // scanning | validating | mismatch | rejected | ok
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState(''); // ← NUEVO: vista previa de la imagen

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // --- Reset del estado (para "Intentar de nuevo") ---
  const resetEstado = useCallback(() => {
    setStatus('scanning');
    setMessage('');
    setPreviewUrl('');
    setMode('camera');
  }, []);

  // --- Validación contra el backend ---
  const handleDecoded = useCallback(
    async (decodedUrl) => {
      setStatus('validating');

      try {
        const response = await fetch('/api/auth/validar-credencial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: decodedUrl,
            tokenVerificacion: formData.tokenVerificacion,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          const tipo = clasificarError(data.error);

          if (tipo === 'rejected') {
            setStatus('rejected');
            setMessage(data.error);
            return;
          }
          if (tipo === 'mismatch') {
            setStatus('mismatch');
            setMessage(data.error);
            return;
          }
          if (tipo === 'expired') {
            setStatus('rejected');
            setMessage('Tu sesión de verificación expiró. Vuelve a ingresar tus datos.');
            setTimeout(onBack, 1500);
            return;
          }
          setStatus('rejected');
          setMessage(data.error || 'Ocurrió un error al validar tu credencial.');
          return;
        }

        updateField('tokenRegistro', data.tokenRegistro);
        setStatus('ok');
        setMessage('Datos validados correctamente.');
        setTimeout(onNext, 900);
      } catch {
        setStatus('rejected');
        setMessage('Ocurrió un error validando tu credencial. Intenta de nuevo.');
      }
    },
    [formData.tokenVerificacion, updateField, onBack, onNext]
  );

  // --- Captura en tiempo real con getUserMedia, canvas y jsQR ---
  useEffect(() => {
    if (mode !== 'camera') return;
    if (status === 'ok') return; // No seguir escaneando si ya se validó

    let isActive = true;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        stopCamera();
        handleDecoded(code.data);
        return;
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanFrame();
      } catch {
        setStatus('rejected');
        setMessage('No se pudo acceder a la cámara. Puedes subir la foto del QR desde tu galería.');
      }
    };

    startCamera();

    return () => {
      isActive = false;
      stopCamera();
    };
  }, [mode, status, stopCamera, handleDecoded]);

  // --- Imagen subida con FileReader, canvas y jsQR ---
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño de imagen
    if (file.size > MAX_FILE_SIZE) {
      setStatus('rejected');
      setMessage(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. ` +
        `El límite es 5 MB. Intenta con una imagen más pequeña.`
      );
      // Limpiar el input para permitir subir otra imagen
      e.target.value = '';
      return;
    }

    // Validación de que sea imagen
    if (!file.type.startsWith('image/')) {
      setStatus('rejected');
      setMessage('El archivo debe ser una imagen (JPG, PNG, etc.).');
      e.target.value = '';
      return;
    }

    setStatus('validating');
    setMessage('');
    setPreviewUrl('');

    const reader = new FileReader();

    reader.onload = (event) => {
      setPreviewUrl(event.target.result);

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleDecoded(code.data);
        } else {
          setStatus('rejected');
          setMessage(
            'No se pudo leer el código QR de la imagen. Verifica que: ' +
            '1) el QR sea visible y nítido, 2) la imagen esté bien iluminada, ' +
            '3) la credencial no esté doblada.'
          );
        }
      };
      img.onerror = () => {
        setStatus('rejected');
        setMessage('No se pudo cargar la imagen. Intenta con otra.');
      };
      img.src = event.target.result;
    };

    reader.onerror = () => {
      setStatus('rejected');
      setMessage('Error al leer el archivo. Intenta de nuevo.');
    };

    reader.readAsDataURL(file);

    // Limpiar el input para permitir subir la misma imagen de nuevo
    e.target.value = '';
  };

  return (
    <div className="scan-step">
      <ul className="scan-instructions">
        <li>Mantén firme la credencial frente a la cámara, con buena iluminación, para leer el código QR.</li>
        <li>Encuéntrate en una buena iluminación para la lectura del código.</li>
        <li>Los datos recibidos serán para fines educativos. Esto sirve para la validación del nombre, número de boleta, carrera y escuela.</li>
      </ul>

      {/* Cámara en vivo */}
      {mode === 'camera' && status !== 'rejected' && status !== 'ok' && (
        <div className="qr-video-box">
          <video ref={videoRef} className="qr-video" muted playsInline />
        </div>
      )}

      {mode === 'upload' && previewUrl && (
        <div className="qr-video-box">
          <img src={previewUrl} alt="QR subido" className="qr-video" />
        </div>
      )}

      {/* Canvas oculto */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {status === 'validating' && <p className="scan-status scan-status-info">Validando datos…</p>}
      {status === 'mismatch' && <p className="scan-status scan-status-warning">{message}</p>}
      {status === 'rejected' && <p className="scan-status scan-status-error">{message}</p>}
      {status === 'ok' && <p className="scan-status scan-status-success">{message}</p>}

      <div className="scan-actions">
        {/* Botón "Corregir mis datos" (solo en mismatch) */}
        {status === 'mismatch' && (
          <Button variant="outline-secondary" onClick={onBack} className="w-100 mb-2">
            Corregir mis datos
          </Button>
        )}

        {(status === 'rejected' || status === 'mismatch') && (
          <Button
            variant="outline-primary"
            onClick={resetEstado}
            className="w-100 mb-2"
          >
            Intentar de nuevo
          </Button>
        )}

        {/* Input oculto para subir archivo */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {/* Botón para subir imagen */}
        <button
          type="button"
          className="scan-upload-link"
          onClick={() => {
            stopCamera();
            setMode('upload');
            setStatus('scanning');
            setMessage('');
            setPreviewUrl('');
            fileInputRef.current?.click();
          }}
        >
          ¿No tienes la credencial física? Sube el QR desde tu galería
        </button>

        {mode === 'upload' && (
          <button
            type="button"
            className="scan-upload-link"
            onClick={() => {
              setMode('camera');
              setStatus('scanning');
              setMessage('');
              setPreviewUrl('');
            }}
          >
            Usar la cámara
          </button>
        )}
      </div>
    </div>
  );
};

export default StepEscaneo;