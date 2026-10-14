import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  const createMockHost = (headers: Record<string, string> = {}) => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const setHeaderMock = jest.fn();

    const response = {
      status: statusMock,
      setHeader: setHeaderMock,
    };

    const request = {
      method: 'POST',
      url: '/api/v1/evaluations/run',
      headers,
    };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, statusMock, jsonMock, setHeaderMock };
  };

  it('should handle HttpException and preserve status and custom message', () => {
    const { host, statusMock, jsonMock, setHeaderMock } = createMockHost({
      'x-correlation-id': 'corr-test-123',
    });

    const exception = new HttpException(
      'Invalid payload provided',
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(setHeaderMock).toHaveBeenCalledWith(
      'x-correlation-id',
      'corr-test-123',
    );
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid payload provided',
        correlationId: 'corr-test-123',
      }),
    );
  });

  it('should sanitize 500 internal server errors without leaking stack or internal details', () => {
    const { host, statusMock, jsonMock } = createMockHost();

    const exception = new Error(
      'Database password failed: super_secret_connection_string',
    );

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const responsePayload = jsonMock.mock.calls[0][0];

    expect(responsePayload.success).toBe(false);
    expect(responsePayload.statusCode).toBe(500);
    expect(responsePayload.message).toBe('An unexpected server error occurred');
    // Ensure sensitive internal message is NOT exposed to client
    expect(responsePayload.message).not.toContain(
      'super_secret_connection_string',
    );
    expect(responsePayload.stack).toBeUndefined();
    expect(responsePayload.correlationId).toBeDefined();
  });
});
