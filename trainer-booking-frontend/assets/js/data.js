export const demoTrainers = [
  {
    id_entrenador: 1,
    nombre: 'Carlos',
    apellido: 'Martínez',
    ciudad: 'Cali',
    foto: 'assets/images/trainer-carlos.jpg',
    descripcion: 'Entrenador profesional de fuerza e hipertrofia con enfoque técnico y progresivo.',
    anos_experiencia: 8,
    calificacion: 4.9,
    especialidades: 'Fuerza, Hipertrofia',
    modalidades: ['Presencial'],
    precio_desde: 80000,
    disponible: 'Hoy 6:00 PM',
    resenas: 312,
    servicios: [
      { id_servicio: 1, nombre_servicio: 'Entrenamiento personalizado', modalidad: 'PRESENCIAL', duracion: 60, precio: 80000, descripcion: 'Sesión individual enfocada en fuerza, técnica y progresión.' },
      { id_servicio: 2, nombre_servicio: 'Plan de hipertrofia', modalidad: 'VIRTUAL', duracion: 45, precio: 65000, descripcion: 'Asesoría virtual y plan semanal de entrenamiento.' }
    ]
  },
  {
    id_entrenador: 2,
    nombre: 'Laura',
    apellido: 'Martínez',
    ciudad: 'Bogotá',
    foto: 'assets/images/trainer-laura.jpg',
    descripcion: 'Especialista en yoga, movilidad y recuperación funcional para todos los niveles.',
    anos_experiencia: 6,
    calificacion: 5,
    especialidades: 'Yoga, Movilidad',
    modalidades: ['Presencial', 'Virtual'],
    precio_desde: 65000,
    disponible: 'Mañana 8:00 AM',
    resenas: 198,
    servicios: [
      { id_servicio: 3, nombre_servicio: 'Yoga y movilidad', modalidad: 'VIRTUAL', duracion: 60, precio: 65000, descripcion: 'Sesión guiada para mejorar movilidad y control corporal.' },
      { id_servicio: 4, nombre_servicio: 'Recuperación funcional', modalidad: 'PRESENCIAL', duracion: 60, precio: 80000, descripcion: 'Trabajo personalizado de movilidad y recuperación.' }
    ]
  },
  {
    id_entrenador: 3,
    nombre: 'Andrés',
    apellido: 'López',
    ciudad: 'Medellín',
    foto: 'assets/images/trainer-andres.jpg',
    descripcion: 'Entrenamiento de CrossFit y cardio con planificación por objetivos.',
    anos_experiencia: 10,
    calificacion: 4.8,
    especialidades: 'CrossFit, Cardio',
    modalidades: ['Presencial'],
    precio_desde: 90000,
    disponible: 'Hoy 8:00 PM',
    resenas: 541,
    servicios: [
      { id_servicio: 5, nombre_servicio: 'Cross training', modalidad: 'PRESENCIAL', duracion: 60, precio: 90000, descripcion: 'Sesión de acondicionamiento de alta intensidad.' },
      { id_servicio: 6, nombre_servicio: 'Cardio performance', modalidad: 'PRESENCIAL', duracion: 45, precio: 75000, descripcion: 'Entrenamiento cardiovascular basado en rendimiento.' }
    ]
  },
  {
    id_entrenador: 4,
    nombre: 'Sofía',
    apellido: 'Hernández',
    ciudad: 'Barranquilla',
    foto: 'assets/images/trainer-sofia.jpg',
    descripcion: 'Entrenadora funcional enfocada en fuerza, core y hábitos sostenibles.',
    anos_experiencia: 5,
    calificacion: 4.9,
    especialidades: 'Funcional, Core',
    modalidades: ['Presencial', 'Virtual'],
    precio_desde: 70000,
    disponible: 'Hoy 7:00 AM',
    resenas: 227,
    servicios: [
      { id_servicio: 7, nombre_servicio: 'Entrenamiento funcional', modalidad: 'PRESENCIAL', duracion: 60, precio: 70000, descripcion: 'Sesión funcional adaptable a tu nivel.' },
      { id_servicio: 8, nombre_servicio: 'Core y estabilidad', modalidad: 'VIRTUAL', duracion: 45, precio: 55000, descripcion: 'Rutina guiada para fortalecer core y postura.' }
    ]
  },
  {
    id_entrenador: 5,
    nombre: 'Valentina',
    apellido: 'Ruiz',
    ciudad: 'Cali',
    foto: 'assets/images/service-running.jpg',
    descripcion: 'Preparadora física para running y acondicionamiento cardiovascular.',
    anos_experiencia: 7,
    calificacion: 4.7,
    especialidades: 'Running, Resistencia',
    modalidades: ['Presencial', 'Virtual'],
    precio_desde: 60000,
    disponible: 'Sábado 6:00 AM',
    resenas: 164,
    servicios: [
      { id_servicio: 9, nombre_servicio: 'Plan de running', modalidad: 'VIRTUAL', duracion: 45, precio: 60000, descripcion: 'Planificación y seguimiento para mejorar ritmo y resistencia.' }
    ]
  },
  {
    id_entrenador: 6,
    nombre: 'Miguel',
    apellido: 'Torres',
    ciudad: 'Bogotá',
    foto: 'assets/images/service-gym.jpg',
    descripcion: 'Entrenador de gimnasio y recomposición corporal basado en evidencia.',
    anos_experiencia: 9,
    calificacion: 4.8,
    especialidades: 'Musculación, Pérdida de grasa',
    modalidades: ['Presencial'],
    precio_desde: 85000,
    disponible: 'Mañana 5:30 PM',
    resenas: 289,
    servicios: [
      { id_servicio: 10, nombre_servicio: 'Recomposición corporal', modalidad: 'PRESENCIAL', duracion: 60, precio: 85000, descripcion: 'Sesión de fuerza y asesoría básica de hábitos.' }
    ]
  }
];

export const demoServices = [
  { id: 1, title: 'Entrenamiento personalizado presencial', description: 'Sesiones uno a uno con un entrenador en el gimnasio o espacio que prefieras. Plan adaptado a tus metas.', price: 80000, image: 'assets/images/service-personal.jpg', size: 'large', badge: 'Más popular' },
  { id: 2, title: 'Entrenamiento virtual', description: 'Sesiones en vivo por videollamada desde la comodidad de tu hogar.', price: 45000, image: 'assets/images/trainer-laura.jpg', badge: 'Online' },
  { id: 3, title: 'Planes mensuales', description: 'Suscripción mensual con acceso ilimitado a sesiones y seguimiento.', price: 280000, image: 'assets/images/service-gym.jpg', badge: 'Ahorra 20%' },
  { id: 4, title: 'Running y resistencia', description: 'Plan de carrera, técnica, ritmo y seguimiento semanal.', price: 60000, image: 'assets/images/service-running.jpg', badge: 'Nuevo' },
  { id: 5, title: 'Entrenamiento funcional', description: 'Movilidad, fuerza y acondicionamiento para la vida diaria.', price: 70000, image: 'assets/images/service-functional.jpg', badge: 'Incluido' }
];

export const demoSpecialties = ['Fuerza', 'Hipertrofia', 'Yoga', 'Movilidad', 'CrossFit', 'Cardio', 'Funcional', 'Core', 'Running'];

export const demoSlots = ['06:00:00', '07:00:00', '08:00:00', '09:30:00', '11:00:00', '16:00:00', '17:30:00', '19:00:00'];
