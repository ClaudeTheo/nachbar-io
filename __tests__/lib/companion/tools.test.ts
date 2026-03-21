import { describe, it, expect } from 'vitest';
import { companionTools, WRITE_TOOLS } from '@/lib/companion/tools';

describe('companionTools', () => {
  it('definiert genau 13 Tools', () => {
    expect(companionTools).toHaveLength(13);
  });

  it('jedes Tool hat gueltiges Anthropic-Format (name, description, input_schema)', () => {
    for (const tool of companionTools) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe('string');
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe('object');
      expect(tool.input_schema.properties).toBeDefined();
    }
  });

  it('alle Tool-Namen sind eindeutig', () => {
    const names = companionTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('create_bulletin_post hat required: title, text', () => {
    const tool = companionTools.find((t) => t.name === 'create_bulletin_post');
    expect(tool).toBeDefined();
    expect(tool!.input_schema.required).toContain('title');
    expect(tool!.input_schema.required).toContain('text');
  });

  it('create_help_request hat category als enum', () => {
    const tool = companionTools.find((t) => t.name === 'create_help_request');
    expect(tool).toBeDefined();
    const catProp = tool!.input_schema.properties.category as Record<string, unknown>;
    expect(catProp.enum).toBeDefined();
    expect(catProp.enum).toContain('transport');
    expect(catProp.enum).toContain('shopping');
  });

  it('navigate_to hat route als enum mit erlaubten Routen', () => {
    const tool = companionTools.find((t) => t.name === 'navigate_to');
    expect(tool).toBeDefined();
    const routeProp = tool!.input_schema.properties.route as Record<string, unknown>;
    expect(routeProp.enum).toBeDefined();
    expect(routeProp.enum).toContain('/dashboard');
    expect(routeProp.enum).toContain('/waste-calendar');
  });

  it('get_waste_dates hat keine required-Parameter', () => {
    const tool = companionTools.find((t) => t.name === 'get_waste_dates');
    expect(tool).toBeDefined();
    expect(tool!.input_schema.required).toBeUndefined();
    expect(Object.keys(tool!.input_schema.properties)).toHaveLength(0);
  });

  it('create_marketplace_listing hat type-enum mit offer/request/free', () => {
    const tool = companionTools.find((t) => t.name === 'create_marketplace_listing');
    expect(tool).toBeDefined();
    const typeProp = tool!.input_schema.properties.type as Record<string, unknown>;
    expect(typeProp.enum).toEqual(['offer', 'request', 'free']);
  });
});

describe('WRITE_TOOLS', () => {
  it('enthaelt genau 9 Write-Tool-Namen', () => {
    expect(WRITE_TOOLS.size).toBe(9);
  });

  it('enthaelt alle Write-Tools', () => {
    const expected = [
      'create_bulletin_post', 'create_help_request', 'create_event',
      'report_issue', 'create_marketplace_listing', 'update_help_offers',
      'send_message', 'update_profile',
    ];
    for (const name of expected) {
      expect(WRITE_TOOLS.has(name)).toBe(true);
    }
  });

  it('enthaelt keine Read-Tools', () => {
    expect(WRITE_TOOLS.has('get_waste_dates')).toBe(false);
    expect(WRITE_TOOLS.has('get_upcoming_events')).toBe(false);
    expect(WRITE_TOOLS.has('navigate_to')).toBe(false);
  });
});
