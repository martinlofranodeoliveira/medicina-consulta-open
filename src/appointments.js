import { randomUUID } from 'node:crypto';
import { ApiError } from './errors.js';
import { appointmentInput, objectWithFields, validDate } from './validation.js';
import { practitioners } from './store.js';

const end = (item) => Date.parse(item.startsAt) + item.durationMinutes * 60_000;

export class AppointmentService {
  constructor(store) { this.store = store; }

  async list({ date, practitionerId } = {}) {
    if (date !== undefined) validDate(date);
    if (practitionerId !== undefined) this.practitioner(practitionerId);
    return (await this.store.read())
      .filter((item) => (!date || item.startsAt.slice(0, 10) === date) &&
        (!practitionerId || item.practitionerId === practitionerId))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  practitioner(id) {
    const found = practitioners.find((item) => item.id === id);
    if (!found) throw new ApiError(404, 'practitioner_not_found', 'Profissional não encontrado no catálogo.');
    return found;
  }

  create(body) {
    const input = appointmentInput(body);
    this.practitioner(input.practitionerId);
    return this.store.mutate((appointments) => {
      const conflict = appointments.some((item) => item.status !== 'cancelled' &&
        item.practitionerId === input.practitionerId &&
        Date.parse(input.startsAt) < end(item) && Date.parse(item.startsAt) < end(input));
      if (conflict) throw new ApiError(409, 'schedule_conflict', 'Esse profissional já tem uma consulta nesse intervalo.');
      const appointment = { id: randomUUID(), ...input, status: 'scheduled', createdAt: new Date().toISOString() };
      appointments.push(appointment);
      return appointment;
    });
  }

  reschedule(id, body) {
    objectWithFields(body, ['startsAt', 'durationMinutes']);
    return this.store.mutate((appointments) => {
      const item = appointments.find((entry) => entry.id === id);
      if (!item) throw new ApiError(404, 'appointment_not_found', 'Consulta não encontrada.');
      if (item.status !== 'scheduled') throw new ApiError(409, 'invalid_transition', 'A consulta já foi finalizada ou cancelada.');
      const input = appointmentInput({
        practitionerId: item.practitionerId,
        patientRef: item.patientRef,
        startsAt: body.startsAt,
        durationMinutes: body.durationMinutes,
      });
      const conflict = appointments.some((entry) => entry.id !== item.id && entry.status !== 'cancelled' &&
        entry.practitionerId === item.practitionerId &&
        Date.parse(input.startsAt) < end(entry) && Date.parse(entry.startsAt) < end(input));
      if (conflict) throw new ApiError(409, 'schedule_conflict', 'Esse profissional já tem uma consulta nesse intervalo.');
      item.startsAt = input.startsAt;
      item.durationMinutes = input.durationMinutes;
      return item;
    });
  }

  status(id, body) {
    objectWithFields(body, ['status']);
    if (!['completed', 'cancelled'].includes(body.status)) {
      throw new ApiError(400, 'validation_error', 'status deve ser completed ou cancelled.');
    }
    return this.store.mutate((appointments) => {
      const item = appointments.find((entry) => entry.id === id);
      if (!item) throw new ApiError(404, 'appointment_not_found', 'Consulta não encontrada.');
      if (item.status !== 'scheduled') throw new ApiError(409, 'invalid_transition', 'A consulta já foi finalizada ou cancelada.');
      item.status = body.status;
      return item;
    });
  }

  remove(id) {
    return this.store.mutate((appointments) => {
      const index = appointments.findIndex((entry) => entry.id === id);
      if (index === -1) throw new ApiError(404, 'appointment_not_found', 'Consulta não encontrada.');
      appointments.splice(index, 1);
      return null;
    });
  }
}
