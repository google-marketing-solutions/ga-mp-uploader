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

import { DataMapping } from './dataMapping';
import { DataValue, InputData } from './inputData';
import {
  MeasurementProtocolPaths,
  MeasurementProtocolPayload,
  MeasurementProtocolSchema,
} from './mpStructure';

type Extractor = (s: DataValue[]) => DataValue;
type PayloadEntry = { payload: MeasurementProtocolPayload; index: number };

export class PayloadCollector {
  _getId: Extractor;
  _payloadEntries: Map<DataValue, PayloadEntry>;

  constructor(idProvider: Extractor) {
    this._getId = idProvider;
    this._payloadEntries = new Map();
  }

  /**
   * Checks if the given row has a payload.
   * @param row the data to check
   * @returns true iff there is a payload in the data
   */
  hasPayloadForRow(row: DataValue[]): boolean {
    const id = this._getId(row);
    return this._payloadEntries.has(id);
  }

  /**
   * Gets a payload for the given data, or creates an empty one
   * @param row the data to get a payload for
   * @returns the payload
   */
  getOrCreatePayloadForRow(row: DataValue[]): MeasurementProtocolPayload {
    const id = this._getId(row);
    let payloadEntry = this._payloadEntries.get(id);
    if (!payloadEntry) {
      payloadEntry = {
        payload: new MeasurementProtocolPayload(),
        index: this._payloadEntries.size,
      };
      this._payloadEntries.set(id, payloadEntry);
    }
    return payloadEntry.payload;
  }

  /**
   * Converts this object's payload into a list
   * @returns the payload list
   */
  toPayloadList(): MeasurementProtocolPayload[] {
    return [...this._payloadEntries.values()]
      .sort((entryA, entryB) => entryA.index - entryB.index)
      .map(entry => entry.payload);
  }

  /**
   * Yields an instance of this object based on data and its mapping
   * @param inputData
   * @param dataMapping
   * @returns the instance
   */
  static forSourceData(
    inputData: InputData,
    dataMapping: DataMapping
  ): PayloadCollector {
    const transactionIdPath = MeasurementProtocolPaths.transactionId;
    const transactionIdEntry =
      dataMapping.getEntryForTargetPath(transactionIdPath);

    if (transactionIdEntry) {
      const transactionIdColumnIndex = inputData.getColumnIndexForName(
        transactionIdEntry.sourceColumn
      );
      return new PayloadCollector(row => row[transactionIdColumnIndex]);
    } else {
      let dummyId = 0;
      return new PayloadCollector(_ => String(dummyId++));
    }
  }
}

/**
 * Transforms the input to an MP payload
 * @param inputData
 * @param dataMapping
 * @param measurementProtocolSchema
 * @param eventName
 * @returns the payload
 */
export function transform(
  inputData: InputData,
  dataMapping: DataMapping,
  measurementProtocolSchema: MeasurementProtocolSchema,
  eventName: string | undefined = undefined
): MeasurementProtocolPayload[] {
  const payloadCollector = PayloadCollector.forSourceData(
    inputData,
    dataMapping
  );

  for (let row = 0; row < inputData.length; row++) {
    const rawRow: DataValue[] = inputData.getRawRow(row);
    const isUnknownPayload = !payloadCollector.hasPayloadForRow(rawRow);
    const payload = payloadCollector.getOrCreatePayloadForRow(rawRow);
    if (isUnknownPayload) {
      if (eventName) {
        payload.setEventName(eventName);
      }
      const eventMappings = dataMapping.getEventMappings();
      for (const { targetPath, sourceColumn } of eventMappings.getEntries()) {
        const schemaEntry =
          measurementProtocolSchema.getEntryForPath(targetPath);
        if (!schemaEntry) {
          continue;
        }
        const inputValue: DataValue = inputData.getValue(sourceColumn, row)!;
        const outputValue = schemaEntry.getSchemaConformantValue(inputValue);
        if (outputValue === undefined) {
          continue;
        }
        payload.setValueOnPath(targetPath, outputValue);
      }
    }
    const itemMappings = dataMapping.getItemMappings();
    if (itemMappings.getSize()) {
      payload.addItem();
      for (const { targetPath, sourceColumn } of itemMappings.getEntries()) {
        const schemaEntry =
          measurementProtocolSchema.getEntryForPath(targetPath);
        if (!schemaEntry) {
          continue;
        }
        const inputValue = inputData.getValue(sourceColumn, row)!;
        const outputValue = schemaEntry.getSchemaConformantValue(inputValue);
        if (outputValue === undefined) {
          continue;
        }
        payload.setValueOnPath(targetPath, outputValue);
      }
    }
  }
  return payloadCollector.toPayloadList();
}
