import ejs from 'ejs';
import { ErrorPageParams } from 'cloudflare-error-page';

import jsTemplate from './js.ejs?raw';
import jsonTemplate from './json.ejs?raw';
import pythonTemplate from './python.ejs?raw';

interface CodeGen {
  name: string;
  language: string;
  generate(params: ErrorPageParams): string;
}

class EjsCodeGen implements CodeGen {
  name: string;
  language: string;
  private template: ejs.TemplateFunction;
  constructor(name: string, language: string, templateContent: string) {
    this.name = name;
    this.language = language;
    this.template = ejs.compile(templateContent);
  }
  protected prepareTemplateArgs(params: ErrorPageParams): Record<string, any> {
    return {};
  }
  generate(params: ErrorPageParams): string {
    const moreArgs = this.prepareTemplateArgs(params);
    return this.template({ params, ...moreArgs });
  }
}

function getErrorCode(error_code?: string | number): string {
  const errorCode = error_code ? error_code + '' : '';
  return /^\d{3}$/.test(errorCode) ? errorCode : '500';
}

class JSCodeGen extends EjsCodeGen {
  constructor(templateContent: string) {
    super('JavaScript Example', 'javascript', templateContent);
  }
  private formatJSArgs(params: ErrorPageParams): string {
    params = { ...params };
    const rayIdKey = Math.random() + '';
    const clientIpKey = Math.random() + '';
    params.ray_id = rayIdKey;
    params.client_ip = clientIpKey;
    const paramsArg = JSON.stringify(params, null, 2)
      .replace(`"${rayIdKey}"`, "(req.get('Cf-Ray') ?? '').substring(0, 16)")
      .replace(`"${clientIpKey}"`, "req.get('X-Forwarded-For') || req.socket.remoteAddress");
    return paramsArg;
  }
  protected prepareTemplateArgs(params: ErrorPageParams): Record<string, any> {
    return {
      errorCode: getErrorCode(params.error_code),
      // TODO: format to JS-style object (key w/o parens)
      indentedParams: this.formatJSArgs(params).replaceAll('\n', '\n  '),
    };
  }
}

class PythonCodeGen extends EjsCodeGen {
  constructor(templateContent: string) {
    super('Python Example', 'python', templateContent);
  }
  private formatPythonArgs(params: ErrorPageParams): string {
    // Covert the parameters to Python format object
    params = { ...params };
    const randomKey = Math.random() + '';
    const rayIdKey = Math.random() + '';
    const clientIpKey = Math.random() + '';
    params.ray_id = rayIdKey;
    params.client_ip = clientIpKey;
    const paramsArg = JSON.stringify(
      params,
      (_, value) => {
        if (typeof value === 'boolean') {
          return randomKey + value.toString();
        } else if (value === null) {
          return randomKey + 'null';
        } else {
          return value;
        }
      },
      4
    )
      .replace(`"${randomKey}true"`, 'True')
      .replace(`"${randomKey}false"`, 'False')
      .replace(`"${randomKey}null"`, 'None')
      .replace(`"${rayIdKey}"`, 'request.headers.get("Cf-Ray", "")[:16]')
      .replace(`"${clientIpKey}"`, 'request.headers.get("X-Forwarded-For") or request.remote_addr');
    return paramsArg;
  }
  protected prepareTemplateArgs(params: ErrorPageParams): Record<string, any> {
    return {
      errorCode: getErrorCode(params.error_code),
      indentedParams: this.formatPythonArgs(params).replaceAll('\n', '\n    '),
    };
  }
}

export const jsCodeGen = new JSCodeGen(jsTemplate);
export const jsonCodeGen = new EjsCodeGen('JSON', 'json', jsonTemplate);
export const pythonCodeGen = new PythonCodeGen(pythonTemplate);
