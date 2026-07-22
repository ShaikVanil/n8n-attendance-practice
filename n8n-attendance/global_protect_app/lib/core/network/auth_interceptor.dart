import 'package:dio/dio.dart';
import 'package:global_protect_app/core/services/secure_storage_service.dart';
import 'package:global_protect_app/features/authentication/data/datasources/auth_local_data_source.dart';
import '../constants/storage_keys.dart';

class AuthInterceptor extends Interceptor {
  final AuthLocalDataSource _authLocalDataSource;

  AuthInterceptor(this._authLocalDataSource);

  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    try {
      // Get token from secure storage
      final authData = await _authLocalDataSource.getCachedAuthData();
      if (authData != null && authData.accessToken.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer ${authData.accessToken}';
      }

      // Add content type if not already set
      if (!options.headers.containsKey('Content-Type')) {
        options.headers['Content-Type'] = 'application/json';
      }

      handler.next(options);
    } catch (e) {
      // If token retrieval fails, continue without token
      handler.next(options);
    }
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async{
    if (err.response?.statusCode == 401) {
        await _authLocalDataSource.clearAuthData();
    }
    handler.next(err);
  }
}
