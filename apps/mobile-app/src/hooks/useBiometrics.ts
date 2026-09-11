import * as LocalAuthentication from 'expo-local-authentication';
import { useState, useEffect } from 'react';

export type BiometricAuthResult = {
  success: boolean;
  error?: string;
  hasHardware: boolean;
  isEnrolled: boolean;
};

export const useBiometrics = () => {
  const [hasHardware, setHasHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      // Verifica se o dispositivo possui o sensor (Digital/FaceID)
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setHasHardware(compatible);

      // Verifica se existem biometrias cadastradas no sistema do telemóvel
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsEnrolled(enrolled);
    })();
  }, []);

  const authenticate = async (): Promise<BiometricAuthResult> => {
    try {
      if (!hasHardware) {
        return { success: false, hasHardware, isEnrolled, error: 'Hardware incompatível' };
      }

      if (!isEnrolled) {
        return { success: false, hasHardware, isEnrolled, error: 'Nenhuma biometria cadastrada' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Acesso Plataforma Jairo O D C',
        fallbackLabel: 'Usar senha',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      return {
        success: result.success,
        hasHardware,
        isEnrolled,
        error: result.success ? undefined : 'Falha na autenticação'
      };
    } catch (err) {
      return {
        success: false,
        hasHardware,
        isEnrolled,
        error: err instanceof Error ? err.message : 'Erro desconhecido'
      };
    }
  };

  return {
    hasHardware,
    isEnrolled,
    authenticate
  };
};