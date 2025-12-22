import ejs from 'ejs';

import jsTemplate from './js.ejs?raw';
import jsonTemplate from './json.ejs?raw';
import pythonTemplate from './python.ejs?raw';

interface CodeGen {
  name: string;
  generate(params: any): string;
}

class EjsCodeGen implements CodeGen {
  name: string;
  private template: ejs.TemplateFunction;
  constructor(name: string, templateContent: any) {
    this.name = name;
    this.template = ejs.compile(templateContent);
  }
  generate(params: any): string {
    return this.template({ params });
  }
}

export const jsCodeGen = new EjsCodeGen('NodeJS Example', jsTemplate);
export const jsonCodeGen = new EjsCodeGen('JSON', jsonTemplate);
export const pythonCodeGen = new EjsCodeGen('Python Example', pythonTemplate);
