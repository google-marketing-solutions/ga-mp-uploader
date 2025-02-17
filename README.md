<!--
Copyright 2023-24 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
<!--
Copyright 2024 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# GA MP Uploader

Disclaimer: This is not an officially supported Google product.

[Purpose](#purpose) •
[Requirements](#requirements) •
[Deployment](#deployment) •
[Configuration](#configuration) •
[Regular Usage](#regular-usage)

## Purpose

*GA MP Uploader* is a lightweight tool to upload events data to Google Analytics (GA) using Measurement Protocol (MP), both

1. to test uploads of one's data into GA, and
2. as a code example to build upon for one's own, fully-featured tool for MP uploads.

# Requirements

To use the tool, you need:

- access to Google Workspace
- access to Google Analytics and your  
  - API secret  
  - _Measurement ID_ or _Firebase App ID_

As use is at your own risk, it makes sense to first understand the Apps Script code, which is TypeScript in the repository and JavaScript once deployed to the Google Sheets template.

# Deployment

## Deploying to use the tool

GA MP Uploader is fully contained in [this](https://docs.google.com/spreadsheets/d/1FYWiFKEjqahV4fsf5wbHnvNDA6ijkL6Pb_s4vVceLVY/edit?usp=sharing) Google Sheets document: it is a template of the required spreadsheet structure but also contains the Apps Script code providing the actual upload functionality. Hence, for mere usage, duplicating the template is "deployment" enough.

## Deploying for further development

While the code in the template can be modified, it is one long file without comments, and hence not overly suitable for further development. Instead, you can do the following:

1. Make sure your system has an up-to-date installation of [Node.js, npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and `git`.
2. Install [clasp](https://github.com/google/clasp) by running `npm install @google/clasp -g`, then log in via `clasp login`.
3. In the [Apps Script settings](https://script.google.com/home/usersettings) page and ensure the Apps Script API is enabled.
4. Check out the code using ```git clone https://github.com/google_marketing_solutions/ga_mp_uploader```.
5. Edit it in the environment of your choice.
6. Deploy the code to Google Sheets using ```npm run deploy```.

During deployment, you will be asked to specify the target document, which should be your copy of the template. Alternatively, you can deploy to an empty sheet, but will then have to reconstruct the template in terms of content and range names (`EventName`, `Stream`, `Mapping`) with the right cell ranges (see the template, menu item \[Data | Named ranges\]).

# Configuration

## MP Schema

While the schema enforced for data sent by Measurement Protocol is predefined by Google, it is subject to change and expansion. The sheet _MP Schema_ is initially filled with a useful subset of available fields, but needs to be expanded on if other values are to be uploaded.

To see what is allowed, you can check the [payload](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference?client_type=firebase#payload) documentation here, which contains links to further details, e.g. to [this page](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events) listing which fields are allowed inside an _event_ to be uploaded. By default, the template assumes that [_purchase_](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events#purchase) events are to be transmitted (see _Event name_ in [Base Configuration](#base-configuration)).

For verification of an example payload, you can use the [Event Builder](https://ga-dev-tools.google/ga4/event-builder/).

> **Note**: The schema listing does not provide information on relationships between values, like the fact that "items" is an array that allows for several products to be reported, or "address" is also one allowing for several addresses.

## User Configuration

In the sheet _2) Configuration_, the following needs to be entered:  

### Base Configuration

* _Stream ID_: listed as _Measurement ID_ or _Firebase App ID_ in the GA user interface at:\
Admin > Data collection and modification > Data Streams > (select your stream)
* _API secret_: the secret associated with your GA account, found on its user interface (available to owners) at:\
Admin > Data collection and modification > Data Streams > (select your stream) > Measurement Protocol API secrets
* _Event name_: any of the event types listed [here](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events)

### Schema Mapping

* Field names (column headers) that will later appear in _1) Data Input_ (and are to be uploaded to MP) need to be entered in column A.
* For each column header in column A, the corresponding field address paths of the MP payload structure need to be entered in column B.

> **Note**: The schema mapping is pre-filled with an example in the provided template.

# Regular Usage

For a one-time test, you would

1. fill the sheet _1) Data Input_ with your data, as shown by the example data in the template, and then  
2. run the three functions in the menu _GA MP Upload_:
    - _① Stage data for GA_ populates the sheet _3 Data Staging_ in the format expected by Measurement Protocol.
    - _② Validate data with GA_ sends that data to MP to verify its structure, but not yet add it to the stream.
    - _③ Send data to GA_ sends the data to MP again, this time actually adding it.

For regular use, you need to set up a process that automates all these steps. (The code could be modified to not need the validation, which is mainly useful for testing during setup.) The automation of staging and sending can be achieved with [installable triggers](https://developers.google.com/apps-script/guides/triggers/installable) using the functions `stageData` and `sendStagedData`.

> **Note**: When testing, ensure you use a different transaction ID each time, as GA will otherwise consider it redundant to what was already reported.

> **Note**: Some user data is expected in a specific hashes format by GA, the conversion to which the tool performs, but it is worth reviewing this before production use to ensure consistent values.

> **Note**: The tool allows supports several items to be reported for the same purchase, simply by repeating the record with different product information. User data, however, is only supported in a restricted form: while it is possible to supply different phone numbers and email addresses in each product record, the postal address must be the same in all records. In a production implementation, one would not keep user data in the list of purchased items, anyway.