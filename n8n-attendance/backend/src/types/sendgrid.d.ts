declare module '@sendgrid/mail' {
  export interface MailData {
    to: string | string[];
    from: string;
    subject: string;
    text?: string;
    html?: string;
    templateId?: string;
    dynamicTemplateData?: Record<string, any>;
  }

  export interface ResponseError {
    message: string;
    code: number;
    response: {
      headers: Record<string, string>;
      body: any;
    };
  }

  export function setApiKey(apiKey: string): void;
  export function send(data: MailData): Promise<[any, any]>;
  export function sendMultiple(data: MailData): Promise<[any, any]>;
}