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

type FieldMapping = {
  sourceColumn: string;
  targetPath: string;
  index: number;
};

export class DataMapping {
  _entries: FieldMapping[];
  _forwardLookup: Map<string, FieldMapping>;
  _reverseLookup: Map<string, FieldMapping>;
  _eventMappings: DataMapping | undefined;
  _itemMappings: DataMapping | undefined;
  _userPropertiesMappings: DataMapping | undefined;
  _userDataMappings: DataMapping | undefined;
  _userAddressMappings: DataMapping | undefined;

  /**
   * @param entries mapping from data-source columns to GA MP properties
   */
  constructor(entries: FieldMapping[]) {
    this._entries = entries;
    this._forwardLookup = new Map(
      this._entries.map(entry => [entry.sourceColumn, entry])
    );
    this._reverseLookup = new Map(
      this._entries.map(entry => [entry.targetPath, entry])
    );
    this._eventMappings = undefined;
    this._itemMappings = undefined;
  }

  /**
   * @returns the number of entries in the mapping
   */
  getSize(): number {
    return this._entries.length;
  }

  /**
   * @returns the entries in the mapping
   */
  getEntries(): FieldMapping[] {
    return this._entries;
  }

  /**
   * Get the MP property for a given data-source column.
   * @param sourceColumn
   * @returns the corresponding property
   */
  getEntryForSourceColumn(sourceColumn: string): FieldMapping {
    return this._forwardLookup.get(sourceColumn)!;
  }

  /**
   * Get the data-source column for a given MP property.
   * @param targetProperty
   * @returns the name of the corresponding data-source column
   */
  getEntryForTargetPath(targetProperty: string): FieldMapping {
    return this._reverseLookup.get(targetProperty)!;
  }

  /**
   * Gets the whole mapping.
   * @returns the mapping
   */
  getMappings() {
    return new DataMapping(this.getEntries());
  }

  /**
   * Yields an instance of this class.
   * @param rangeName the data range with which to initialise the mapping
   * @returns the instance
   */
  static read(rangeName: string): DataMapping {
    const range =
      SpreadsheetApp.getActiveSpreadsheet().getRangeByName(rangeName)!;
    return new DataMapping(
      range
        .getValues()
        .filter(row => row[0] !== '')
        .map(([sourceColumn, targetPath], index) => ({
          sourceColumn,
          targetPath,
          index,
        }))
        .filter(entry => entry.sourceColumn && entry.targetPath)
    );
  }
}
