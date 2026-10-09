const fs = require('fs');

let content = fs.readFileSync('src/db/index.ts', 'utf8');

const importToAdd = "import { JournalEntry } from '../types/journal';\n";
content = content.replace(/import \{ ClinicalSurveyResult \} from '\.\.\/data\/clinicalSurveys';\n/, "import { ClinicalSurveyResult } from '../data/clinicalSurveys';\n" + importToAdd);

content = content.replace(/clinicalSurveyResults!: Table<ClinicalSurveyResult, number>;\n/, "clinicalSurveyResults!: Table<ClinicalSurveyResult, number>;\n  journalEntries!: Table<JournalEntry, number>;\n");

const versionToAdd = "\n    this.version(5).stores({\n      journalEntries: '++id, date, createdAt',\n    });\n";
content = content.replace(/this\.version\(4\)\.stores\(\{\n      clinicalSurveyResults: '\+\+id, timestamp, date',\n    \}\);\n/, "this.version(4).stores({\n      clinicalSurveyResults: '++id, timestamp, date',\n    });\n" + versionToAdd);

content = content.replace(/this\.clinicalSurveyResults,\n/, "this.clinicalSurveyResults,\n      this.journalEntries,\n");

fs.writeFileSync('src/db/index.ts', content, 'utf8');
