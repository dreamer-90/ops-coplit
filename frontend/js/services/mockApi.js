export const PRESET_ALERTS = {
  shelter: {
    title: 'SHELTER IN PLACE',
    en: 'Attention: Please shelter in place immediately. Await further instructions from stadium personnel.',
    es: 'Atención: Por favor, refúgiese en el lugar de inmediato. Espere instrucciones del personal.',
    fr: 'Attention: Veuillez vous abriter sur place immédiatement. Attendez les instructions du personnel.',
    ar: 'تنبيه: يرجى الاحتماء في مكانكم فوراً. انتظروا المزيد من التعليمات من موظفي الملعب.',
    pt: 'Atenção: Por favor, abrigue-se no local imediatamente. Aguarde instruções dos funcionários.'
  },
  exits: {
    title: 'SEEK EXITS',
    en: 'Phased evacuation active. Please proceed calmly to your nearest emergency exit.',
    es: 'Evacuación controlada activa. Diríjase con calma a la salida de emergencia más cercana.',
    fr: 'Évacuation progressive active. Veuillez vous diriger calmement vers la sortie la plus proche.',
    ar: 'إخلاء تدريجي نشط. يرجى التوجه بهدوء إلى أقرب مخرج طوارئ.',
    pt: 'Evacuação faseada ativa. Por favor, dirija-se calmamente à saída de emergência mais próxima.'
  },
  medical: {
    title: 'MEDICAL INCIDENT',
    en: 'First aid responders are en route. Please clear the area to allow access.',
    es: 'Equipos de primeros auxilios en camino. Por favor, despeje el área para permitir el acceso.',
    fr: 'Les secouristes sont en route. Veuillez libérer la zone pour faciliter l’accès.',
    ar: 'مسعفو الإسعافات الأولية في الطريق. يرجى إخلاء المنطقة لتسهيل الوصول.',
    pt: 'Equipes de primeiros socorros a caminho. Por favor, desobstrua a área para permitir o acesso.'
  },
  concourse: {
    title: 'CLEAR CONCOURSES',
    en: 'Please avoid congregating in concourses. Keep walk pathways clear.',
    es: 'Evite congregarse en los pasillos. Mantenga despejadas las vías de paso.',
    fr: 'Veuillez éviter de vous rassembler dans les halls. Laissez les passages libres.',
    ar: 'يرجى تجنب التجمع في الممرات. حافظوا على خلو مسارات المشي.',
    pt: 'Por favor, evite aglomerações nos corredores. Mantenha os caminhos livres.'
  }
};

export function getMockData(path) {
  if (path === '/api/events') {
    return {
      events: [
        { id: "EVT-001", zone: "A", title: "gate_congestion", severity: "high" },
        { id: "EVT-002", zone: "C", title: "crowd_surge", severity: "critical" },
        { id: "EVT-003", zone: "B", title: "medical_incident", severity: "medium" },
        { id: "EVT-004", zone: "D", title: "gate_congestion", severity: "low" }
      ]
    };
  }
  return null;
}

export function generateMockEvent(type = 'routine') {
  if (type === 'critical') {
    return {
      event_id: `EVT-${Date.now()}`,
      recommended_action: 'EMERGENCY EVACUATION ROUTE B',
      reasoning: 'Critical bottleneck detected at Gate C. Flow rate dropped by 80%.',
      risk_level: 'critical',
      affected_zones: ['C', 'B'],
      staff_allocation: [{ role: 'security', from_zone: 'A', to_zone: 'C' }],
      timestamp: new Date().toISOString()
    };
  } else if (type === 'warning') {
    return {
      event_id: `EVT-${Date.now()}`,
      recommended_action: 'OPEN OVERFLOW GATES',
      reasoning: 'Density in Zone A approaching 90% capacity limit.',
      risk_level: 'high',
      affected_zones: ['A'],
      staff_allocation: [{ role: 'volunteer', from_zone: 'B', to_zone: 'A' }],
      timestamp: new Date().toISOString()
    };
  }
  return {
    event_id: `EVT-${Date.now()}`,
    recommended_action: 'MONITOR ZONE D',
    reasoning: 'Slight anomaly in egress flow.',
    risk_level: 'low',
    affected_zones: ['D'],
    staff_allocation: [],
    timestamp: new Date().toISOString()
  };
}
