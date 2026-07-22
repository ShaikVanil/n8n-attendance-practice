import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/user.dart';

abstract class AuthRepository {
  Future<Either<Failure, User>> login(String email, String password);
  Future<Either<Failure, User>> getCurrentUser();
  Future<Either<Failure, void>> logout();
  Future<Either<Failure, User>> refreshToken();
  Future<bool> isLoggedIn();
  Future<bool> isTokenValid();
  Future<bool> shouldRefreshToken();
  Future<DateTime?> getTokenExpiryTime();
}