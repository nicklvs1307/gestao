import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Camera, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [ready, setReady] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    if (mounted) setReady(true);
                }
            } catch (err: any) {
                if (!mounted) return;
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setError('Permissão de câmera negada. Permita o acesso nas configurações do navegador.');
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    setError('Nenhuma câmera encontrada neste dispositivo.');
                } else {
                    setError('Erro ao acessar a câmera. Tente novamente.');
                }
            }
        };

        startCamera();

        return () => {
            mounted = false;
            stopStream();
        };
    }, [stopStream]);

    const handleCapture = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || capturing) return;

        setCapturing(true);

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context unavailable');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('Falha ao capturar foto'))),
                    'image/jpeg',
                    0.92
                );
            });

            const timestamp = Date.now();
            const file = new File([blob], `foto-${timestamp}.jpg`, { type: 'image/jpeg' });

            stopStream();
            onCapture(file);
        } catch {
            setError('Erro ao capturar foto. Tente novamente.');
            setCapturing(false);
        }
    }, [capturing, onCapture, stopStream]);

    const handleClose = useCallback(() => {
        stopStream();
        onClose();
    }, [stopStream, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
        >
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 text-white"
                >
                    <X size={20} />
                </button>
                <span className="text-white text-sm font-medium">Tirar Foto</span>
                <div className="w-10" />
            </div>

            <div className="flex-1 relative overflow-hidden bg-black">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                        <AlertTriangle size={48} className="text-amber-400 mb-4" />
                        <p className="text-white text-sm font-medium mb-6">{error}</p>
                        <button
                            onClick={handleClose}
                            className="h-10 px-6 bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {!ready && !capturing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                <Loader2 className="animate-spin text-white" size={32} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {!error && (
                <div className="flex items-center justify-center py-8 bg-black/80">
                    <button
                        onClick={handleCapture}
                        disabled={!ready || capturing}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 transition-all active:scale-95"
                    >
                        {capturing ? (
                            <Loader2 className="animate-spin text-white" size={28} />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-white" />
                        )}
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default CameraCapture;
