import * as https from "https";
import axios, { AxiosRequestConfig } from "axios";
import { logger } from "@zensurance/enabling-logger";
import { ApiHandlerErrors, IAPIHandler, RequestType } from "./definitions";

/**
 * Implementation of IAPIHandler for making HTTP requests using Axios.
 */
export class ApiHandler implements IAPIHandler {
  private axiosConfig: axios.AxiosInstance;

  /**
   * Creates an instance of ApiHandler.
   * @param {string} url - The base URL of the API.
   * @param {string} [key] - The authentication key for the API, if required.
   */
  constructor(private url: string, private key?: string) {
    this.validateConfig();
    this.setConfig();
  }

  /**
   * Makes an HTTP request using Axios based on the provided request type.
   * @param {RequestType} requestType - The type of the HTTP request (GET, POST, PUT).
   * @param {string} endpoint - The endpoint for the API request.
   * @param {TData} [payload] - The data to be sent with the request (if applicable).
   * @param {axios.AxiosRequestHeaders} [headers] - The headers to be included with the request.
   * @returns {Promise<TReturnType>} A promise that resolves with the response data.
   */
  public async makeApiHandlerRequest<TData, TReturnType>(
    requestType: RequestType,
    endpoint: string,
    payload?: TData,
    headers?: axios.AxiosRequestHeaders
  ): Promise<TReturnType> {
    try {
      const config: AxiosRequestConfig = {
        data: payload,
        headers,
      };
      const response = await this.axiosConfig.request<TReturnType>({
        method: requestType,
        url: endpoint,
        data:
          requestType === RequestType.POST || requestType === RequestType.PUT
            ? payload
            : undefined,
        headers,
      });
      return response.data;
    } catch (error) {
      logger.error(
        `[CORE-API] makeApiHandlerRequest: Encountered error: ${error}`,
        {
          details: [{ error: error.stack, endpoint, payload }],
        }
      );
      throw error;
    }
  }

  /**
   * Gets the timeout threshold for API requests, including an additional 5 seconds.
   * @returns {number} The timeout threshold in milliseconds.
   * @throws {Error} Throws an error if LIGHTBRIDGE_TIMEOUT_THRESHOLD is not a number.
   */
  private getTimeoutThreshold(): number {
    const threshold = Number(process.env.LIGHTBRIDGE_TIMEOUT_THRESHOLD);
    if (!isNaN(threshold)) {
      return threshold + 5000;
    }
    throw new Error(
      "Environment variable `LIGHTBRIDGE_TIMEOUT_THRESHOLD` is not a number"
    );
  }

  /**
   * Validates the configuration for the API handler.
   * @throws {Error} Throws an error if the URL is invalid or not provided.
   */
  private validateConfig() {
    if (!this.url) {
      throw new Error("Invalid URL or authentication key");
    }
  }

  /**
   * Sets the configuration for Axios HTTP requests, including base URL, timeout, and headers.
   */
  private setConfig() {
    this.axiosConfig = axios.create({
      baseURL: this.url,
      timeout: this.getTimeoutThreshold(),
      headers: { authentication: this.key },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
  }
}
