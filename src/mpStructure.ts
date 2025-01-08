/**
 * Copyright 2023-24 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DataValue } from './inputData';

export const MeasurementProtocolPaths = {
  item: 'events.params.items',
  eventName: 'events.name',
  transactionId: 'events.params.transaction_id',
};

type Payload = {
  events?: Event[];
  client_id?: string; // ultimately required
  user_id?: string;
  non_personalized_ads?: boolean;
  userProperties?: UserProperties;
  app_instance_id?: string;
};

type Event = {
  name?: string;
  params?: EventParams;
};

type EventParams = {
  items?: EventParamsItem[];
  transaction_id?: string;
  value?: number;
  currency?: string;
  timestamp_microseconds?: string;
  coupon?: string;
  affiliation?: string;
};

type EventParamsItem = {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
  index?: number;
};

type UserProperties = {
  [key: string]: { [key: string]: DataValue };
};

export type StreamResponse = { responseCode: number; responseText: string };

export class MeasurementProtocolSchemaEntry {
  path: string;
  type: string;
  isRequired: string;

  constructor(path: string, type: string, isRequired: string) {
    this.path = path;
    this.type = type;
    this.isRequired = isRequired;
  }

  /**
   * Converts values to a string as expected by the GA MP.
   * @param value
   * @returns
   */
  static _convertToString(value: DataValue): string | undefined {
    switch (typeof value) {
      case 'string':
        return value ? value : undefined;
      case 'number':
        return '' + value;
      case 'boolean':
        return ('' + value).toUpperCase();
    }
  }

  /**
   * Converts values to a float as expected by the GA MP.
   * @param value
   * @returns
   */
  static _convertToFloat(value: DataValue): number {
    switch (typeof value) {
      case 'string':
        return parseFloat(value);
      case 'number':
        return value;
      case 'boolean':
        return value ? 1 : 0;
    }
  }

  /**
   * Converts values to an integer as expected by the GA MP.
   * @param value
   * @returns
   */
  static _convertToInteger(value: DataValue): number {
    switch (typeof value) {
      case 'string':
        return parseInt(value, 10);
      case 'number':
        return Math.floor(value);
      case 'boolean':
        return value ? 1 : 0;
    }
  }

  /**
   * Converts values to a boolean as expected by the GA MP.
   * @param value
   * @returns
   */
  static _convertToBoolean(value: DataValue): boolean {
    switch (typeof value) {
      case 'string':
        return value.toLowerCase() === 'true';
      case 'number':
        return value > 0;
      case 'boolean':
        return value;
    }
  }

  /**
   * Gets the value GA MP expects for a given input value.
   * @param value
   * @returns the converted value, or undefined if the input is invalid
   */
  getSchemaConformantValue(value: DataValue): DataValue | undefined {
    switch (this.type) {
      case 'string':
        return MeasurementProtocolSchemaEntry._convertToString(value);
      case 'float':
        return MeasurementProtocolSchemaEntry._convertToFloat(value);
      case 'integer':
        return MeasurementProtocolSchemaEntry._convertToInteger(value);
      case 'boolean':
        return MeasurementProtocolSchemaEntry._convertToBoolean(value);
      default:
        return undefined;
    }
  }
}

export class MeasurementProtocolSchema {
  _entries: MeasurementProtocolSchemaEntry[];
  _pathLookup: Map<string, MeasurementProtocolSchemaEntry>;

  constructor(schemaEntries: MeasurementProtocolSchemaEntry[]) {
    this._entries = schemaEntries;
    this._pathLookup = new Map(schemaEntries.map(entry => [entry.path, entry]));
  }

  /**
   * Gets the entry in the GA MP for the given address path.
   * @param path
   * @returns
   */
  getEntryForPath(path: string): MeasurementProtocolSchemaEntry {
    return this._pathLookup.get(path)!;
  }

  /**
   * Gets an instance of this class.
   * @param sheetName the name of the sheet with the schema to initialise with
   * @returns the instance
   */
  static read(sheetName: string): MeasurementProtocolSchema {
    const schemaSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)!;
    const schemaRange: GoogleAppsScript.Spreadsheet.Range =
      schemaSheet.getDataRange();
    const schemaEntries: MeasurementProtocolSchemaEntry[] = schemaRange
      .getValues()
      .filter(row => row[0] !== '')
      .map(row => new MeasurementProtocolSchemaEntry(row[0], row[1], row[2]));
    return new MeasurementProtocolSchema(schemaEntries);
  }

  /**
   * Checks if the given path is one for event parameter items in the GA MP payload hierarchy.
   * @param path
   * @returns
   */
  static isItemPath(path: string): boolean {
    return path.startsWith(MeasurementProtocolPaths.item + '.');
  }
}

export class MeasurementProtocolPayload {
  _payloadData: Payload;

  constructor(payloadData: Payload = {}) {
    this._payloadData = payloadData || {};
  }

  /**
   * Converts the payload to a string.
   * @param pretty whether to pretty-print the output
   * @returns the payload as a string
   */
  toJson(pretty = false): string {
    return JSON.stringify(this._payloadData, undefined, pretty ? 2 : undefined);
  }

  /**
   * Gets the event data in this payload.
   * @returns the payload's events if existing, otherwise an array with an empty event
   */
  _getEventData(): Event {
    const payload = this._payloadData;
    if (!('events' in payload)) {
      payload['events'] = [{}];
    }
    return payload.events![0];
  }

  /**
   * Gets the event parameters in this payload.
   * @returns the payload's event parameters if existing, otherwise an empty object
   */
  _getParamsData(): EventParams {
    const event = this._getEventData();
    if (!('params' in event)) {
      event['params'] = {};
    }
    return event['params']!;
  }

  /**
   * Gets the event parameter items data in this payload.
   * @returns the items if existing, otherwise an empty array
   */
  _getItemsData(): EventParamsItem[] {
    const params = this._getParamsData();
    if (!('items' in params)) {
      params['items'] = [];
    }
    return params['items']!;
  }

  /**
   * Gets the event parameters' last item data in this payload.
   * @returns the last item's data if any exist, otherwise undefined
   */
  _getCurrentItemData(): EventParamsItem | undefined {
    const itemsData = this._getItemsData();
    return itemsData.length ? itemsData[itemsData.length - 1] : undefined;
  }

  /**
   * Gets the user properties data in this payload.
   * @returns the payload's user properties if existing, otherwise an empty object
   */
  _getUserPropertiesData(): UserProperties {
    const payload = this._payloadData;
    if (!('userProperties' in payload)) {
      payload['userProperties'] = {};
    }
    return payload['userProperties']!;
  }

  /**
   * Converts the payload by renaming client_id to app_instance_id
   * @returns the modified payload
   */
  convertToAppPayload(): MeasurementProtocolPayload {
    const payload = this._payloadData;
    if ('client_id' in payload) {
      payload['app_instance_id'] = payload['client_id'];
      delete payload['client_id'];
    }
    return new MeasurementProtocolPayload(payload);
  }

  /**
   * Sets the name of this payload's event
   * @param eventName
   */
  setEventName(eventName: string) {
    this.setValueOnPath(MeasurementProtocolPaths.eventName, eventName);
  }

  /**
   * Adds an empty item to the payload's event parameters
   */
  addItem() {
    this._getItemsData().push({});
  }

  /**
   * Sets the value of a property in this payload.
   * @param path the position of the property
   * @param value the value to set
   */
  setValueOnPath(path: string, value: DataValue) {
    const parts = path.split('.');
    if (parts.length === 0 || value === undefined) {
      return;
    }
    const targetProperty = parts.pop()!;
    if (parts.length > 0) {
      const targetObjectName: string = parts.pop()!;
      switch (targetObjectName) {
        case 'events': {
          const events = this._getEventData() as Record<string, DataValue>;
          events[targetProperty as keyof Event] = value;
          break;
        }
        case 'params': {
          const params = this._getParamsData() as Record<string, DataValue>;
          params[targetProperty as keyof EventParams] = value;
          break;
        }
        case 'items': {
          const items = this._getCurrentItemData() as Record<string, DataValue>;
          if (items) {
            items[targetProperty as keyof EventParamsItem] = value;
          }
          break;
        }
        case 'userProperties': {
          const userProperties = this._getUserPropertiesData();
          userProperties[targetProperty as keyof Payload] = { value: value };
          break;
        }
        default: // !! ??
      }
    } else if (value !== undefined) {
      const payload = this._payloadData as Record<string, DataValue>;
      payload[targetProperty as keyof Payload] = value;
    }
  }

  /**
   * Yields an instance of this class
   * @param json the initial payload as JSON
   * @returns the instance
   */
  static fromJson(json: string): MeasurementProtocolPayload {
    return new MeasurementProtocolPayload(JSON.parse(json));
  }
}
