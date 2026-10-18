import { ApiError } from './errors.js';

const bad = (message) => { throw new ApiError(400, 'validation_error', message); };

export function objectWithFields(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) bad('Envie um objeto JSON.');
  if (Object.keys(value).some((key) => !allowed.includes(key))) bad('O JSON contém campos desconhecidos.');
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) bad('Use uma data válida no formato AAAA-MM-DD.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    bad('Use uma data válida no formato AAAA-MM-DD.');
  }
  return value;
}

export function appointmentInput(value) {
  objectWithFields(value, ['practitionerId', 'patientRef', 'startsAt', 'durationMinutes']);
  if (typeof value.practitionerId !== 'string' || !/^demo-[a-z0-9-]{1,40}$/.test(value.practitionerId)) {
    bad('Selecione um profissional do catálogo.');
  }
  if (typeof value.patientRef !== 'string' || !/^[a-zA-Z0-9_-]{1,48}$/.test(value.patientRef)) {
    bad('patientRef deve ser uma referência fictícia de 1 a 48 letras, números, _ ou -.');
  }
  if (typeof value.startsAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.startsAt)) {
    bad('startsAt deve informar data, horário sem segundos e fuso: 2030-04-08T09:00:00-03:00.');
  }
  validDate(value.startsAt.slice(0, 10));
  const startsAt = new Date(value.startsAt);
  if (Number.isNaN(startsAt.valueOf())) bad('startsAt contém um horário ou fuso inválido.');
  const hour = Number(value.startsAt.slice(11, 13));
  const minute = Number(value.startsAt.slice(14, 16));
  if (hour > 23 || minute > 59 || minute % 15 !== 0) bad('Use horários em intervalos de 15 minutos.');
  if (!Number.isInteger(value.durationMinutes) || value.durationMinutes < 15 ||
      value.durationMinutes > 120 || value.durationMinutes % 15 !== 0) {
    bad('durationMinutes deve ser múltiplo de 15, entre 15 e 120.');
  }
  return {
    practitionerId: value.practitionerId,
    patientRef: value.patientRef,
    startsAt: startsAt.toISOString(),
    durationMinutes: value.durationMinutes,
  };
}
