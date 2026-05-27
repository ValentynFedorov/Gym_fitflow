import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IncidentSeverity, IncidentStatus, Role } from '@prisma/client';
import { OccupancyGateway } from '../websocket/occupancy.gateway';

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OccupancyGateway,
  ) {}

  // ---------- Equipment CRUD-ish ----------
  list(status?: string) {
    return this.prisma.equipment.findMany({
      where: status ? { status } : {},
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            incidents: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      type: string;
      status: string;
      nextServiceAt: Date | null;
    }>,
  ) {
    return this.prisma.equipment.update({ where: { id }, data });
  }

  // ---------- Incidents ----------
  async reportIncident(
    reporter: { id: string; role: Role },
    body: { equipmentId: string; severity?: IncidentSeverity; note?: string },
  ) {
    if (!body.equipmentId) throw new BadRequestException('equipmentId required');

    const equip = await this.prisma.equipment.findUnique({
      where: { id: body.equipmentId },
    });
    if (!equip) throw new NotFoundException('Equipment not found');

    const incident = await this.prisma.equipmentIncident.create({
      data: {
        equipmentId: body.equipmentId,
        reportedById: reporter.id,
        severity: body.severity ?? IncidentSeverity.MEDIUM,
        note: body.note,
      },
    });

    // Flip equipment to NEEDS_REPAIR while there's an open ticket.
    if (equip.status === 'ACTIVE') {
      await this.prisma.equipment.update({
        where: { id: equip.id },
        data: { status: 'NEEDS_REPAIR' },
      });
    }

    // Push real-time admin event so the inbox can refresh.
    this.gateway.emitAdminEvent({
      type: 'EQUIPMENT_INCIDENT',
      payload: {
        incidentId: incident.id,
        equipmentId: equip.id,
        equipmentName: equip.name,
        severity: incident.severity,
        reportedBy: reporter.id,
      },
    });

    return incident;
  }

  listIncidents(status?: IncidentStatus) {
    return this.prisma.equipmentIncident.findMany({
      where: status ? { status } : {},
      include: {
        equipment: { select: { id: true, name: true, type: true, status: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateIncident(
    actor: { id: string; role: Role },
    id: string,
    body: { status?: IncidentStatus; severity?: IncidentSeverity; note?: string },
  ) {
    const incident = await this.prisma.equipmentIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    const next = await this.prisma.equipmentIncident.update({
      where: { id },
      data: {
        status: body.status ?? incident.status,
        severity: body.severity ?? incident.severity,
        note: body.note ?? incident.note,
        resolvedAt:
          body.status === IncidentStatus.RESOLVED
            ? new Date()
            : body.status && body.status !== IncidentStatus.RESOLVED
              ? null
              : incident.resolvedAt,
        resolvedById:
          body.status === IncidentStatus.RESOLVED ? actor.id : incident.resolvedById,
      },
    });

    // If this was the last open incident, flip equipment back to ACTIVE.
    if (body.status === IncidentStatus.RESOLVED) {
      const openCount = await this.prisma.equipmentIncident.count({
        where: {
          equipmentId: incident.equipmentId,
          status: { in: [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS] },
        },
      });
      if (openCount === 0) {
        await this.prisma.equipment.update({
          where: { id: incident.equipmentId },
          data: { status: 'ACTIVE' },
        });
      }
    }

    this.gateway.emitAdminEvent({
      type: 'EQUIPMENT_INCIDENT_UPDATED',
      payload: { incidentId: id, status: next.status },
    });

    return next;
  }
}
