import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/notification.dart';
import '../bloc/notification_bloc.dart';
import '../bloc/notification_event.dart';
import '../bloc/notification_state.dart';

class NotificationHistoryPage extends StatefulWidget {
  const NotificationHistoryPage({super.key});

  @override
  State<NotificationHistoryPage> createState() => _NotificationHistoryPageState();
}

class _NotificationHistoryPageState extends State<NotificationHistoryPage> {
  @override
  void initState() {
    super.initState();
    context.read<NotificationBloc>().add(LoadNotificationsEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification History'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'mark_all_read':
                  context.read<NotificationBloc>().add(MarkAllNotificationsAsReadEvent());
                  break;
                case 'clear_all':
                  _showClearAllDialog();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'mark_all_read',
                child: Text('Mark All as Read'),
              ),
              const PopupMenuItem(
                value: 'clear_all',
                child: Text('Clear All'),
              ),
            ],
          ),
        ],
      ),
      body: BlocBuilder<NotificationBloc, NotificationState>(
        builder: (context, state) {
          if (state is NotificationLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (state is NotificationError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading notifications',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    state.message,
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<NotificationBloc>().add(LoadNotificationsEvent());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          
          if (state is NotificationsLoaded) {
            if (state.notifications.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.notifications_none,
                      size: 64,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No notifications yet',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'You\'ll see your attendance notifications here',
                      style: Theme.of(context).textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
            }
            
            return RefreshIndicator(
              onRefresh: () async {
                context.read<NotificationBloc>().add(LoadNotificationsEvent());
              },
              child: ListView.builder(
                itemCount: state.notifications.length,
                itemBuilder: (context, index) {
                  final notification = state.notifications[index];
                  return _NotificationTile(
                    notification: notification,
                    onTap: () {
                      if (!notification.isRead) {
                        context.read<NotificationBloc>().add(
                          MarkNotificationAsReadEvent(notification.id),
                        );
                      }
                    },
                    onDismiss: () {
                      context.read<NotificationBloc>().add(
                        DeleteNotificationEvent(notification.id),
                      );
                    },
                  );
                },
              ),
            );
          }
          
          return const SizedBox.shrink();
        },
      ),
    );
  }
  
  void _showClearAllDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Notifications'),
        content: const Text(
          'Are you sure you want to clear all notifications? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.read<NotificationBloc>().add(ClearAllNotificationsEvent());
            },
            child: const Text('Clear All'),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  const _NotificationTile({
    required this.notification,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Theme.of(context).colorScheme.error,
        child: Icon(
          Icons.delete,
          color: Theme.of(context).colorScheme.onError,
        ),
      ),
      child: ListTile(
        leading: _getNotificationIcon(),
        title: Text(
          notification.title,
          style: TextStyle(
            fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              notification.message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('MMM dd, yyyy • HH:mm').format(notification.timestamp),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        trailing: notification.isRead
            ? null
            : Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  shape: BoxShape.circle,
                ),
              ),
        onTap: onTap,
      ),
    );
  }
  
  Widget _getNotificationIcon() {
    IconData iconData;
    Color? color;
    
    switch (notification.type) {
      case NotificationType.success:
        iconData = Icons.check_circle;
        color = Colors.green;
        break;
      case NotificationType.error:
        iconData = Icons.error;
        color = Colors.red;
        break;
      case NotificationType.warning:
        iconData = Icons.warning;
        color = Colors.orange;
        break;
      case NotificationType.info:
        iconData = Icons.info;
        color = Colors.blue;
        break;
      case NotificationType.sync:
        iconData = Icons.sync;
        color = Colors.purple;
        break;
        default:
        iconData = Icons.sync;
        color = Colors.purple;
        break;
    }
    
    return Icon(iconData, color: color);
  }
}