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

import { StreamResponse, MeasurementProtocolPayload } from './mpStructure';

const MEASUREMENT_PROTOCOL_BASE_URL =
  'https://www.google-analytics.com/mp/collect';
const MEASUREMENT_PROTOCOL_DEBUG_URL =
  'https://www.google-analytics.com/debug/mp/collect';

export class MeasurementProtocolStream {
  _isWebStream: boolean;
  _streamUrl: string;
  _debugUrl: string;

  constructor(measurementId: string, apiSecret: string) {
    this._isWebStream = measurementId.startsWith('G-');
    const measurementIdParam = this._isWebStream
      ? 'measurement_id'
      : 'firebase_app_id';
    const streamParams = `${measurementIdParam}=${measurementId}&api_secret=${apiSecret}`;
    this._streamUrl = `${MEASUREMENT_PROTOCOL_BASE_URL}?${streamParams}`;
    this._debugUrl = `${MEASUREMENT_PROTOCOL_DEBUG_URL}?${streamParams}`;
  }

  /**
   * Returns whether this object is a web stream.
   * @returns
   */
  isWebStream(): boolean {
    return this._isWebStream;
  }

  /**
   * Returns whether this object is an app stream.
   * @returns
   */
  isAppStream(): boolean {
    return !this._isWebStream;
  }

  /**
   * Gets the URL of the MP API used in this object
   * @returns the URL
   */
  getUrl(): string {
    return this._streamUrl;
  }

  /**
   * Sends an MP request to GA
   * @param targetUrl the URL to send to
   * @param measurementProtocolPayload the payload to send
   * @returns the response code and text
   */
  _send(
    targetUrl: string,
    measurementProtocolPayload: MeasurementProtocolPayload
  ): StreamResponse {
    const response = UrlFetchApp.fetch(targetUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: measurementProtocolPayload.toJson(),
    });
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    return { responseCode, responseText };
  }

  /**
   * Sends a regular MP request to GA
   * @param measurementProtocolPayload
   * @returns the response code and text
   */
  send(measurementProtocolPayload: MeasurementProtocolPayload): StreamResponse {
    return this._send(this._streamUrl, measurementProtocolPayload);
  }

  /**
   * Sends a validation MP request to GA
   * @param measurementProtocolPayload
   * @returns the response code and text
   */
  validate(
    measurementProtocolPayload: MeasurementProtocolPayload
  ): StreamResponse {
    return this._send(this._debugUrl, measurementProtocolPayload);
  }

  /**
   * Yields an instance of this class
   * @param rangeName the range with which to initialise the request
   * @returns the instance
   */
  static getConfigured(rangeName: string): MeasurementProtocolStream {
    const streamRange: GoogleAppsScript.Spreadsheet.Range =
      SpreadsheetApp.getActiveSpreadsheet().getRangeByName(rangeName)!;
    const streamValues: string[][] = streamRange.getValues();
    const [[measurementId], [apiSecret]] = streamValues;
    return new MeasurementProtocolStream(measurementId, apiSecret);
  }
}
