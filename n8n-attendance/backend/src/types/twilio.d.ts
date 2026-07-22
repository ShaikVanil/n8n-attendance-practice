declare module 'twilio' {
  export interface TwilioClient {
    messages: {
      create(options: {
        body: string;
        from: string;
        to: string;
      }): Promise<any>;
    };
  }

  export default function twilio(accountSid: string, authToken: string): TwilioClient;
}