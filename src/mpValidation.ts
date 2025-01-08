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

import { StreamResponse } from './mpStructure';

type ValidationMessage = {
  description: string;
  fieldPath?: string;
  validationCode?: string;
};

type ValidationResult = {
  validationMessages?: ValidationMessage[];
  [key: string]: object | undefined;
};

export class MeasurementProtocolValidationResult {
  _result: ValidationResult;
  _validationMessages: ValidationMessage[];

  constructor(result: ValidationResult) {
    this._result = result;
    this._validationMessages = this._result['validationMessages'] || [];
  }

  /**
   * Checks if the validation result is valid
   * @returns true iff it is valid
   */
  isValid(): boolean {
    return !this._validationMessages.length;
  }

  /**
   * Formats a validation message into human-readable text.
   * @param messageObject the validation message
   * @returns the resulting text message
   */
  _formatMessage(messageObject: ValidationMessage): string {
    let message = messageObject.description;
    if (messageObject.fieldPath) {
      message = `Error on field "${messageObject.fieldPath}": ${message}`;
    }
    if (messageObject.validationCode) {
      message = `${message} (Code: ${messageObject.validationCode})`;
    }
    return message;
  }

  /**
   * Obtains a text that describes the validation result.
   * @returns an error message of the text "VALID"
   */
  toCellValue(): string {
    if (this.isValid()) {
      return 'VALID';
    } else {
      const formatted = this._validationMessages
        .map(message => this._formatMessage(message))
        .join('\n');
      return formatted;
    }
  }

  /**
   * Obtains an instance of this object, initialised from a validation result.
   * @param responseText
   * @param responseCode
   * @returns the instance
   */
  static fromResponse({ responseText, responseCode }: StreamResponse) {
    if (responseCode === 200) {
      return new MeasurementProtocolValidationResult(JSON.parse(responseText));
    } else {
      return new MeasurementProtocolValidationResult({
        validationMessages: [
          {
            description: `Could not validate payload (HTTP error: ${responseCode}`,
            validationCode: 'ERROR',
          },
        ],
      });
    }
  }
}
