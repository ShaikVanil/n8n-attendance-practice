import 'package:dio/dio.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/services/api_error_recovery_service.dart';
import '../models/auth_response_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthResponseModel> login(String email, String password);
  Future<AuthResponseModel> refreshToken(String refreshToken);
  Future<void> logout();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio dio;
  final APIErrorRecoveryService _errorRecoveryService;

  AuthRemoteDataSourceImpl({
    required this.dio,
    APIErrorRecoveryService? errorRecoveryService,
  }) : _errorRecoveryService = errorRecoveryService ?? APIErrorRecoveryService();

  @override
  Future<AuthResponseModel> login(String email, String password) async {
    return await _errorRecoveryService.retryWithBackoff(() async {
      try {
        final response = await dio.post(
          '${ApiConstants.baseUrl}${ApiConstants.loginEndpoint}',
          data: {
            'email': email,
            'password': password,
          },
        );

        if (response.statusCode == 200) {
          return AuthResponseModel.fromJson(response.data);
        } else {
          throw ServerException('Login failed with status: ${response.statusCode}');
        }
      } on DioException catch (e) {
        final errorDetails = _errorRecoveryService.analyzeAPIError(e);
        
        switch (errorDetails.type) {
          case APIErrorType.authenticationError:
            throw AuthenticationException(errorDetails.userFriendlyMessage);
          case APIErrorType.networkTimeout:
            throw NetworkException(errorDetails.userFriendlyMessage);
          case APIErrorType.serverError:
            throw ServerException(errorDetails.userFriendlyMessage);
          case APIErrorType.rateLimitError:
            throw RateLimitException(errorDetails.userFriendlyMessage);
          default:
            throw ServerException(errorDetails.userFriendlyMessage);
        }
      } catch (e) {
        throw ServerException('Unexpected error during login: ${e.toString()}');
      }
    });
  }

  @override
  Future<AuthResponseModel> refreshToken(String refreshToken) async {
    return await _errorRecoveryService.retryWithBackoff(() async {
      try {
        final response = await dio.post(
          '${ApiConstants.baseUrl}${ApiConstants.refreshEndpoint}',
          data: {
            'refreshToken': refreshToken,
          },
        );

        if (response.statusCode == 200) {
          return AuthResponseModel.fromJson(response.data);
        } else {
          throw ServerException('Token refresh failed with status: ${response.statusCode}');
        }
      } on DioException catch (e) {
        final errorDetails = _errorRecoveryService.analyzeAPIError(e);
        
        switch (errorDetails.type) {
          case APIErrorType.authenticationError:
            throw AuthenticationException(errorDetails.userFriendlyMessage);
          case APIErrorType.networkTimeout:
            throw NetworkException(errorDetails.userFriendlyMessage);
          case APIErrorType.serverError:
            throw ServerException(errorDetails.userFriendlyMessage);
          default:
            throw ServerException(errorDetails.userFriendlyMessage);
        }
      } catch (e) {
        throw ServerException('Unexpected error during token refresh: ${e.toString()}');
      }
    });
  }

  @override
  Future<void> logout() async {
    try {
      final response = await dio.post(
        '${ApiConstants.baseUrl}${ApiConstants.logoutEndpoint}',
        options: Options(
          headers: {
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode != 200) {
        throw ServerException('Logout failed with status: ${response.statusCode}');
      }
    } on DioException catch (e) {
      final errorDetails = _errorRecoveryService.analyzeAPIError(e);
      
      // For logout, we might want to continue even if there's an error
      // since the user wants to log out anyway
      if (!errorDetails.isTemporary) {
        // Log the error but don't throw for permanent errors during logout
        print('Logout error (continuing anyway): ${errorDetails.message}');
        return;
      }
      
      throw ServerException(errorDetails.userFriendlyMessage);
    } catch (e) {
      throw ServerException('Unexpected error during logout: ${e.toString()}');
    }
  }
}