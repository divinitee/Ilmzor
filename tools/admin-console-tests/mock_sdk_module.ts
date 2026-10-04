// Stands in for npm:@base44/sdk inside entry.ts (see import_map.json).
import { makeWorld } from './mock_base44.ts';
export const world = makeWorld();
export const createClientFromRequest = world.createClientFromRequest;
