import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
export class OccupancyGateway {
  @WebSocketServer()
  server!: Server;

  emitZoneUpdate(zoneId: string, current: number, max: number) {
    this.server.emit('occupancy_update', { zoneId, current, max });
  }

  emitGlobalUpdate(total: number) {
    this.server.emit('global_occupancy', { total });
  }

  emitAdminEvent(event: { type: string; payload: any }) {
    this.server.emit('admin_event', event);
  }

  // Backwards-compatible helper used by existing code
  broadcastOccupancyUpdate(zoneId: string, current: number, max: number) {
    this.emitZoneUpdate(zoneId, current, max);
  }
}
