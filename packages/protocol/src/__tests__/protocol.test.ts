import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_VERSION,
  MessageType,
  createProtocolMessage,
} from '../index.js';

describe('@syncode/protocol - Protocol Message Factory', () => {
  it('should create valid protocol messages conforming to specification', () => {
    const msg = createProtocolMessage(MessageType.PING, { test: 123 }, { senderId: 'user_1', roomId: 'room_a' });
    expect(msg.version).toBe(PROTOCOL_VERSION);
    expect(msg.type).toBe(MessageType.PING);
    expect(msg.senderId).toBe('user_1');
    expect(msg.roomId).toBe('room_a');
    expect(msg.payload).toEqual({ test: 123 });
    expect(typeof msg.timestamp).toBe('number');
    expect(msg.id).toBeDefined();
  });
});

