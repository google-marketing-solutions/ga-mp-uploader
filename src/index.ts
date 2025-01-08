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
import { InputData } from './inputData';
import { MeasurementProtocolSchema } from './mpStructure';
import { MeasurementProtocolStream } from './mpUpload';
import { SheetName, RangeName } from './sheetStructure';
import { transform } from './transform';
import { Staging } from './staging';

/**
 * Combines source data with configuration into objects for upload to GA.
 */
function stageData() {
  const stream = MeasurementProtocolStream.getConfigured(RangeName.stream);
  const eventName: string = SpreadsheetApp.getActiveSpreadsheet()
    .getRangeByName('EventName')!
    .getValue();
  const staging = Staging.get(SheetName.staging);
  const schema = MeasurementProtocolSchema.read(SheetName.schema);
  const mapping = DataMapping.read(RangeName.mapping);
  const data = InputData.read(SheetName.input);
  let payloads = transform(
    data,
    mapping,
    schema,
    eventName ? eventName : undefined
  );
  if (stream.isAppStream()) {
    payloads = payloads.map(payload => payload.convertToAppPayload());
  }
  staging.restart(stream);
  staging.appendPayloads(payloads);
}

/**
 * Validates correctness of objects for upload to GA.
 */
function validateStagedData() {
  const stream = MeasurementProtocolStream.getConfigured(RangeName.stream);
  const staging = Staging.get(SheetName.staging);
  staging.validatePayloads(stream);
}

/**
 * Uploads the previously generated and validated objects to GA.
 */
function sendStagedData() {
  const stream = MeasurementProtocolStream.getConfigured(RangeName.stream);
  const staging = Staging.get(SheetName.staging);
  staging.sendPayloads(stream);
}

/**
 * Installs the main functionality in the Sheets menu.
 */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function onOpen() {
  Staging.get(SheetName.staging).clear();
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('GA MP Upload')
    .addItem('① Stage data for GA', stageData.name)
    .addItem('② Validate data with GA', validateStagedData.name)
    .addItem('③ Send data to GA', sendStagedData.name)
    .addToUi();
}
