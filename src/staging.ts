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

import { MeasurementProtocolPayload } from './mpStructure';
import { MeasurementProtocolStream } from './mpUpload';
import { MeasurementProtocolValidationResult } from './mpValidation';

export class Staging {
  _sheet: GoogleAppsScript.Spreadsheet.Sheet;
  _payloads: MeasurementProtocolPayload[] | undefined;
  static _instance: Staging | undefined;

  constructor(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
    this._sheet = sheet;
  }

  /**
   * Clears the staging sheet
   */
  clear() {
    this._sheet.clear();
  }

  /**
   * Clears and initialises the staging sheet
   * @param stream
   */
  restart(stream: MeasurementProtocolStream) {
    this.clear();
    this._sheet.appendRow([stream.getUrl()]);
    this._sheet.appendRow(['-']);
  }

  /**
   * Appends payloads to the staging sheet
   * @param measurementProtocolPayloads
   */
  appendPayloads(measurementProtocolPayloads: MeasurementProtocolPayload[]) {
    this._payloads = measurementProtocolPayloads;
    for (const payload of measurementProtocolPayloads) {
      this._sheet.appendRow([payload.toJson(true), 'UNVALIDATED', 'UNSENT']);
    }
    SpreadsheetApp.flush();
  }

  /**
   * Validates payloads in the staging sheet
   * @param stream
   */
  validatePayloads(stream: MeasurementProtocolStream) {
    const lastRow = this._sheet.getLastRow();
    const payloadRange = this._sheet.getRange(`A3:A${lastRow}`);
    const validationRange = this._sheet.getRange(`B3:B${lastRow}`);
    const payloads = payloadRange
      .getValues()
      .map(([payloadJson]) => MeasurementProtocolPayload.fromJson(payloadJson));
    const validationResults = payloads
      .map(payload => stream.validate(payload))
      .map(response =>
        MeasurementProtocolValidationResult.fromResponse(response)
      );
    validationRange.setValues(
      validationResults.map(result => [result.toCellValue()])
    );
  }

  /**
   * Sends the payloads in the staging sheet
   * @param stream
   */
  sendPayloads(stream: MeasurementProtocolStream) {
    const lastRow = this._sheet.getLastRow();
    const payloadDataRange = this._sheet.getRange(`A3:B${lastRow}`);
    const statusRange = this._sheet.getRange(`C3:C${lastRow}`);
    const statuses = [];
    for (const [payloadJson, validation] of payloadDataRange.getValues()) {
      if (
        validation === 'UVALIDATED' ||
        validation === '' ||
        validation === 'VALID'
      ) {
        const payload = MeasurementProtocolPayload.fromJson(payloadJson);
        const result = stream.send(payload);
        if (result.responseCode === 204) {
          statuses.push('SENT');
        } else {
          statuses.push(
            `HTTP ${result.responseCode} ERROR: ${result.responseText}`
          );
        }
      } else {
        statuses.push('UNSENT');
      }
    }
    statusRange.setValues(statuses.map(status => [status]));
  }

  /**
   * Gets an instance of this class
   * @param sheetName the name of the sheet to initialise with
   * @returns the instance
   */
  static get(sheetName: string) {
    if (!Staging._instance) {
      const sheet: GoogleAppsScript.Spreadsheet.Sheet =
        SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)!;
      Staging._instance = new Staging(sheet);
    }
    return Staging._instance;
  }
}
