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

export type DataValue = string | number | boolean;

export class InputData {
  _columnNames: string[];
  _columnNameLookup: Map<string, number>;
  _data: DataValue[][];
  length: number;

  constructor(columnNames: string[], data: DataValue[][]) {
    this._columnNames = columnNames;
    this._columnNameLookup = new Map(
      columnNames.map((columnName, i) => [columnName, i])
    );
    this._data = data;
    this.length = data.length;
  }

  /**
   * Gets the raw data at the given row of the input table.
   * @param rowIndex the row whose data to get
   * @returns the row's data
   */
  getRawRow(rowIndex: number): DataValue[] {
    return this._data[rowIndex];
  }

  /**
   * Gets the column number of the given column name
   * @param columnName
   * @returns the number if the name exists, otherwise -1
   */
  getColumnIndexForName(columnName: string): number {
    let columnIndex = this._columnNameLookup.get(columnName);
    if (columnIndex === undefined) {
      columnIndex = -1;
    }
    return columnIndex;
  }

  /**
   * Gets the value at the given column and row position
   * @param columnName
   * @param rowIndex
   * @returns the value, or undefined if an invalid input is given
   */
  getValue(columnName: string, rowIndex: number): DataValue | undefined {
    const columnIndex = this.getColumnIndexForName(columnName);
    if (columnIndex >= 0) {
      return this._data[rowIndex][columnIndex];
    }
    return undefined;
  }

  /**
   * Yields an instance of this class
   * @param rangeName the range with the initialisation data
   * @returns the instance
   */
  static read(rangeName: string): InputData {
    const sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(rangeName)!;
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const data = values.slice(1);
    return new InputData(headers, data);
  }
}
