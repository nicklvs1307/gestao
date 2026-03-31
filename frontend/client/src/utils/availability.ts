import { Category, OperatingHour } from '../types';

export const isCategoryAvailable = (category: Category): boolean => {
  const now = new Date();
  
  // 1. Verificar Dia da Semana
  // getDay() retorna 0 para Domingo, 6 para Sábado.
  // Nosso banco salva 1 para Domingo, 7 para Sábado.
  const currentDay = (now.getDay() + 1).toString();
  
  if (category.availableDays) {
    const days = category.availableDays.split(',');
    if (!days.includes(currentDay)) {
      return false;
    }
  }

  // 2. Verificar Horário
  if (category.startTime && category.endTime && category.startTime !== '00:00' && category.endTime !== '00:00') {
    const [startH, startM] = category.startTime.split(':').map(Number);
    const [endH, endM] = category.endTime.split(':').map(Number);
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTimeInMinutes = startH * 60 + startM;
    const endTimeInMinutes = endH * 60 + endM;

    // Lógica para horários que atravessam a meia-noite (ex: 18:00 as 02:00)
    if (startTimeInMinutes > endTimeInMinutes) {
      // Se a hora atual é depois do início OU antes do fim (madrugada)
      if (currentTime < startTimeInMinutes && currentTime > endTimeInMinutes) {
        return false;
      }
    } else {
      // Lógica normal
      if (currentTime < startTimeInMinutes || currentTime > endTimeInMinutes) {
        return false;
      }
    }
  }

  return true;
};

export const isRestaurantOpen = (operatingHours?: OperatingHour[]): boolean => {
  if (!operatingHours || operatingHours.length === 0) return true;

  const now = new Date();
  const currentDay = now.getDay(); // 0=Dom ... 6=Sáb
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todaySchedule = operatingHours.find(h => h.dayOfWeek === currentDay);
  if (!todaySchedule || todaySchedule.isClosed) return false;

  const [startH, startM] = todaySchedule.openingTime.split(':').map(Number);
  const [endH, endM] = todaySchedule.closingTime.split(':').map(Number);
  const startTime = startH * 60 + startM;
  const endTime = endH * 60 + endM;

  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }
  return currentTime >= startTime && currentTime < endTime;
};
