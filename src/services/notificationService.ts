import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export class NotificationService {
    static async sendPushNotification(pushToken: string, title: string, body: string, data: any = {}) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            return;
        }

        const message: ExpoPushMessage = {
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
        };

        try {
            const chunks = expo.chunkPushNotifications([message]);
            const tickets = [];
            for (const chunk of chunks) {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            }
            console.log('Push notification tickets:', tickets);
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }
}
