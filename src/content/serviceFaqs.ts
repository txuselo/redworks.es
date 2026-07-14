import type { FaqItem } from '../lib/faqSchema';

// Hand-written FAQ content for a subset of service pages, keyed by content-collection slug.
// Not every service has an entry yet — ServicePage.astro only renders the FAQ block when
// a mapping exists, so this can grow incrementally without touching the extraction pipeline.
export const SERVICE_FAQS: Record<string, FaqItem[]> = {
  electricidad: [
    {
      question: '¿Qué es una instalación eléctrica de baja tensión?',
      answer:
        'Es cualquier instalación eléctrica que funciona por debajo de 1.000 voltios en corriente alterna, que es el caso de prácticamente todas las instalaciones de oficinas, comercios y viviendas. Incluye el cuadro eléctrico, el cableado, los mecanismos y las protecciones.',
    },
    {
      question: '¿Necesito un boletín eléctrico para mi instalación?',
      answer:
        'Sí, cualquier instalación nueva o reforma de cierta entidad requiere un boletín eléctrico (certificado de instalación) emitido por un instalador autorizado, como Redworks Solutions, para poder dar de alta el suministro con la compañía eléctrica.',
    },
    {
      question: '¿Con qué frecuencia hay que revisar una instalación eléctrica?',
      answer:
        'Depende del tipo de instalación y su uso, pero como norma general recomendamos una revisión de mantenimiento anual para instalaciones comerciales e industriales, y siempre tras cualquier incidencia o ampliación de carga eléctrica.',
    },
    {
      question: '¿Hacéis instalaciones eléctricas completas en oficinas nuevas?',
      answer:
        'Sí. Diseñamos, planificamos y ejecutamos instalaciones eléctricas completas de baja tensión para oficinas, locales comerciales y naves, incluyendo la homologación acorde a la legislación vigente en la Comunidad de Madrid.',
    },
  ],
  seguridad: [
    {
      question: '¿Qué diferencia hay entre cámaras CCTV analógicas e IP?',
      answer:
        'Las cámaras analógicas transmiten la señal por cable coaxial a un grabador dedicado, mientras que las cámaras IP envían vídeo digital por red (Ethernet o wifi), con mayor resolución y la posibilidad de integrarse con otros sistemas. En Redworks trabajamos con ambas tecnologías según las necesidades de cada instalación.',
    },
    {
      question: '¿Puedo ver las cámaras de seguridad desde el móvil?',
      answer:
        'Sí, los sistemas de videovigilancia IP que instalamos permiten visualizar las cámaras en remoto desde el móvil o el ordenador, con acceso seguro a través de la aplicación del fabricante o de un servicio en la nube.',
    },
    {
      question: '¿Qué es un sistema de control de accesos?',
      answer:
        'Es un sistema que gestiona quién puede entrar a unas instalaciones y cuándo, mediante tarjetas, códigos, huella o reconocimiento facial. Permite saber en todo momento la ubicación y los horarios de entrada y salida del personal y visitantes.',
    },
    {
      question: '¿Se puede integrar la videovigilancia con el control de accesos?',
      answer:
        'Sí. Diseñamos sistemas de seguridad centralizados donde la videovigilancia, el control de accesos y los interfonos funcionan de forma coordinada, facilitando la gestión desde un único punto.',
    },
  ],
  'telefonia-voip': [
    {
      question: '¿Qué es la telefonía VoIP?',
      answer:
        'VoIP (Voice over IP) es una tecnología que transmite las llamadas de voz a través de internet en lugar de la red telefónica tradicional. Permite gestionar llamadas desde teléfonos IP, ordenadores o móviles, con centralitas más flexibles y económicas.',
    },
    {
      question: '¿Necesito fibra óptica para usar telefonía VoIP?',
      answer:
        'No es imprescindible, pero sí recomendable. Una conexión estable con suficiente ancho de banda (fibra óptica o una buena línea de datos) mejora notablemente la calidad de las llamadas VoIP, especialmente con varias líneas simultáneas.',
    },
    {
      question: '¿Puedo mantener mi número de teléfono actual al pasar a VoIP?',
      answer:
        'Sí, es posible portar tu numeración actual a una centralita VoIP sin perder continuidad en las llamadas. Nos encargamos de gestionar la portabilidad como parte de la instalación.',
    },
    {
      question: '¿Qué ventajas tiene la telefonía VoIP frente a la tradicional?',
      answer:
        'Menor coste por línea y llamada, gestión centralizada desde varios dispositivos y ubicaciones, escalabilidad sencilla al crecer el equipo, y funciones avanzadas como grabación de llamadas o desvíos configurables que la telefonía tradicional no ofrece de serie.',
    },
  ],
  paneles: [
    {
      question: '¿Cuánto se puede ahorrar con placas solares en una empresa?',
      answer:
        'El ahorro depende del consumo del negocio, la superficie disponible y la orientación de la instalación. En términos generales, el autoconsumo fotovoltaico reduce de forma significativa la factura eléctrica al cubrir parte del consumo diurno con energía propia.',
    },
    {
      question: '¿Existen subvenciones para instalar paneles solares?',
      answer:
        'Sí, suele haber ayudas y deducciones fiscales para autoconsumo fotovoltaico a nivel estatal y autonómico, aunque las condiciones cambian con el tiempo. Te asesoramos sobre las ayudas vigentes en el momento de tu proyecto.',
    },
    {
      question: '¿Cuánto se tarda en amortizar una instalación de placas solares?',
      answer:
        'El plazo de amortización depende de la inversión inicial, el consumo y las horas de sol disponibles, pero en instalaciones bien dimensionadas para negocios suele situarse entre varios años, con la instalación siguiendo generando ahorro muchos años después.',
    },
    {
      question: '¿Necesito permisos para instalar placas solares en mi negocio?',
      answer:
        'Sí, toda instalación fotovoltaica requiere darse de alta como instalación de autoconsumo y, según el tamaño, puede necesitar permisos municipales o de la compañía eléctrica. Nos encargamos de toda la tramitación como parte del proyecto.',
    },
  ],
};
