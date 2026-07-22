import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';
import '../datasources/auth_local_data_source.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final AuthLocalDataSource localDataSource;
  final NetworkInfo networkInfo;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, User>> login(String email, String password) async {
    try {
      final authResponse = await remoteDataSource.login(email, password);
      await localDataSource.cacheAuthData(authResponse);
      return Right(authResponse.user.toEntity());
    } on ServerException {
      return Left(ServerFailure('Login failed. Please check your credentials.'));
    } on NetworkException {
      return Left(NetworkFailure('No internet connection. Please try again.'));
    } catch (e) {
      return Left(ServerFailure('An unexpected error occurred.'));
    }
  }

  @override
  Future<Either<Failure, User>> getCurrentUser() async {
    try {
      final cachedAuth = await localDataSource.getCachedAuthData();
      if (cachedAuth != null) {
        return Right(cachedAuth.user.toEntity());
      }
      return Left(CacheFailure('No user data found'));
    } catch (e) {
      return Left(CacheFailure('Failed to get user data'));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
   try {
      // Clear all cached authentication data
      await localDataSource.clearAuthData();
      
      // Optionally call backend logout endpoint to invalidate server-side session
      try {
        await remoteDataSource.logout();
      } catch (e) {
        // Continue with local logout even if server logout fails
        // This ensures user can always logout locally
      }
      
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure('Failed to logout'));
    }
  }

  @override
  Future<Either<Failure, User>> refreshToken() async {
    try {
      // Check network connectivity first
      if (!await networkInfo.isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final cachedAuth = await localDataSource.getCachedAuthData();
      if (cachedAuth == null) {
        return Left(CacheFailure('No refresh token found'));
      }
      
      final newAuthResponse = await remoteDataSource.refreshToken(cachedAuth.refreshToken);
      await localDataSource.cacheAuthData(newAuthResponse);
      return Right(newAuthResponse.user.toEntity());
    } on ServerException {
      await localDataSource.clearAuthData();
      return Left(ServerFailure('Session expired. Please login again.'));
    } on NetworkException {
      return Left(NetworkFailure('Network error during token refresh'));
    } catch (e) {
      return Left(ServerFailure('Failed to refresh token'));
    }
  }

  @override
  Future<bool> isLoggedIn() async {
    try {
      final cachedAuth = await localDataSource.getCachedAuthData();
      if (cachedAuth == null) return false;
      
      // Check if token is expired
      if (cachedAuth.expiresAt.isBefore(DateTime.now())) {
        return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }

  @override
  Future<bool> isTokenValid() async {
    try {
      final cachedAuth = await localDataSource.getCachedAuthData();
      if (cachedAuth == null) return false;
      
      // Token is valid if it hasn't expired yet
      return cachedAuth.expiresAt.isAfter(DateTime.now());
    } catch (e) {
      return false;
    }
  }

  @override
  Future<bool> shouldRefreshToken() async {
    try {
      final cachedAuth = await localDataSource.getCachedAuthData();
      if (cachedAuth == null) return false;
      
      // Refresh token if it expires within the next 5 minutes
      final refreshThreshold = DateTime.now().add(const Duration(minutes: 5));
      return cachedAuth.expiresAt.isBefore(refreshThreshold);
    } catch (e) {
      return false;
    }
  }

  @override
  Future<DateTime?> getTokenExpiryTime() async {
    try {
      final cachedAuth = await localDataSource.getCachedAuthData();
      return cachedAuth?.expiresAt;
    } catch (e) {
      return null;
    }
  }
}