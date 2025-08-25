// 🔴 ROJO VIRAL MINI-APP SERVER
// Revolutionary Social Commerce Platform that integrates with ROJO Ecosystem
// Built to make your ROJO project go VIRAL! 🚀

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ SECURITY & PERFORMANCE MIDDLEWARE
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.base.org", "https://base.org"]
        }
    }
}));

app.use(compression());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://rojo-ecosystem-production.up.railway.app', 'https://base.org', 'https://*.base.org']
        : ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    }
});

app.use('/api/', apiLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// 📊 REQUEST LOGGING
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`🔴 ${timestamp} - ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// 🎯 ROJO VIRAL ANALYTICS CLASS
class ROJOViralAnalytics {
    constructor() {
        this.socialShares = new Map();
        this.viralCoefficient = 1.2;
        this.activeUsers = new Set();
        this.groupPurchases = new Map();
    }

    trackSocialShare(userId, platform, contentType) {
        const shareId = crypto.randomUUID();
        const shareData = {
            id: shareId,
            userId: userId,
            platform: platform,
            contentType: contentType,
            timestamp: new Date().toISOString(),
            potentialReach: this.calculateReach(platform),
            viralScore: Math.random() * 5 + 5 // 5-10 viral score
        };

        this.socialShares.set(shareId, shareData);
        console.log(`🚀 Viral Share Tracked:`, shareData);
        return shareData;
    }

    calculateReach(platform) {
        const reachMultipliers = {
            'twitter': 500,
            'facebook': 300,
            'instagram': 400,
            'tiktok': 800,
            'discord': 200,
            'telegram': 150
        };
        return Math.floor(Math.random() * reachMultipliers[platform] || 250) + 50;
    }

    getViralMetrics() {
        const totalShares = this.socialShares.size;
        const totalReach = Array.from(this.socialShares.values())
            .reduce((sum, share) => sum + share.potentialReach, 0);
        
        return {
            totalShares: totalShares,
            totalReach: totalReach,
            viralCoefficient: this.viralCoefficient,
            activeUsers: this.activeUsers.size,
            avgViralScore: totalShares > 0 
                ? Array.from(this.socialShares.values())
                    .reduce((sum, share) => sum + share.viralScore, 0) / totalShares
                : 0
        };
    }

    updateViralCoefficient() {
        // Simulate dynamic viral coefficient based on activity
        const baseCoeff = 1.0;
        const activityBonus = Math.min(this.activeUsers.size * 0.1, 1.0);
        const shareBonus = Math.min(this.socialShares.size * 0.05, 0.5);
        
        this.viralCoefficient = baseCoeff + activityBonus + shareBonus;
        return this.viralCoefficient;
    }
}

// 🤝 SOCIAL ENGINE CLASS  
class ROJOSocialEngine {
    constructor() {
        this.friendConnections = new Map();
        this.socialActivities = [];
        this.leaderboard = new Map();
        this.achievements = new Map();
    }

    connectFriends(userId1, userId2) {
        if (!this.friendConnections.has(userId1)) {
            this.friendConnections.set(userId1, new Set());
        }
        if (!this.friendConnections.has(userId2)) {
            this.friendConnections.set(userId2, new Set());
        }

        this.friendConnections.get(userId1).add(userId2);
        this.friendConnections.get(userId2).add(userId1);

        this.addSocialActivity(userId1, 'friend_connection', { connectedWith: userId2 });
        this.addSocialActivity(userId2, 'friend_connection', { connectedWith: userId1 });
    }

    addSocialActivity(userId, activityType, metadata = {}) {
        const activity = {
            id: crypto.randomUUID(),
            userId: userId,
            type: activityType,
            metadata: metadata,
            timestamp: new Date().toISOString(),
            points: this.calculateActivityPoints(activityType)
        };

        this.socialActivities.push(activity);
        
        // Update leaderboard
        const currentScore = this.leaderboard.get(userId) || 0;
        this.leaderboard.set(userId, currentScore + activity.points);

        // Keep only last 100 activities for performance
        if (this.socialActivities.length > 100) {
            this.socialActivities = this.socialActivities.slice(-100);
        }

        return activity;
    }

    calculateActivityPoints(activityType) {
        const pointsMap = {
            'friend_connection': 50,
            'viral_share': 25,
            'group_purchase': 100,
            'achievement_unlock': 75,
            'referral_complete': 150
        };
        return pointsMap[activityType] || 10;
    }

    getFriendNetwork(userId) {
        return Array.from(this.friendConnections.get(userId) || []);
    }

    getLeaderboard(limit = 10) {
        return Array.from(this.leaderboard.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([userId, score], index) => ({
                rank: index + 1,
                userId: userId,
                score: score,
                badge: index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔥'
            }));
    }

    getRecentActivity(limit = 5) {
        return this.socialActivities
            .slice(-limit)
            .reverse()
            .map(activity => ({
                ...activity,
                displayText: this.formatActivityText(activity)
            }));
    }

    formatActivityText(activity) {
        const userId = activity.userId.substring(0, 8);
        switch (activity.type) {
            case 'friend_connection':
                return `${userId} connected with a new ROJO rebel! 🤝`;
            case 'viral_share':
                return `${userId} spread the ROJO revolution on ${activity.metadata.platform}! 📱`;
            case 'group_purchase':
                return `${userId} led a group purchase with ${activity.metadata.groupSize} rebels! 👥`;
            case 'achievement_unlock':
                return `${userId} unlocked: ${activity.metadata.title}! 🏆`;
            default:
                return `${userId} joined the ROJO rebellion! 🔴`;
        }
    }
}

// Initialize engines
const viralAnalytics = new ROJOViralAnalytics();
const socialEngine = new ROJOSocialEngine();

// 🎯 CORE ENDPOINTS

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    const metrics = viralAnalytics.getViralMetrics();
    res.json({ 
        status: 'operational', 
        timestamp: new Date().toISOString(),
        message: '🔴 ROJO Viral Mini-App is conquering the digital world!',
        ecosystem: {
            rojo_integration: true,
            viral_engine: true,
            social_features: true,
            base_compatibility: true
        },
        liveMetrics: {
            viralCoefficient: metrics.viralCoefficient,
            activeUsers: metrics.activeUsers,
            totalShares: metrics.totalShares,
            viralMomentum: metrics.viralCoefficient > 1 ? 'Exponential! 🚀' : 'Building 📈'
        }
    });
});

// 🚀 VIRAL SHARING ENDPOINTS

// Track viral share
app.post('/api/viral/share', (req, res) => {
    try {
        const { userId, platform, contentType, customMessage } = req.body;
        
        if (!userId || !platform) {
            return res.status(400).json({
                error: 'Missing required fields: userId and platform'
            });
        }

        // Track the viral share
        const shareData = viralAnalytics.trackSocialShare(userId, platform, contentType || 'general');
        viralAnalytics.activeUsers.add(userId);
        
        // Add to social activity
        socialEngine.addSocialActivity(userId, 'viral_share', {
            platform: platform,
            contentType: contentType,
            viralScore: shareData.viralScore
        });

        // Update viral coefficient
        const newCoefficient = viralAnalytics.updateViralCoefficient();

        res.json({
            success: true,
            message: '🚀 Your ROJO rebellion post is going viral!',
            shareData: {
                id: shareData.id,
                platform: platform,
                potentialReach: shareData.potentialReach,
                viralScore: shareData.viralScore,
                viralCoefficient: newCoefficient
            },
            rewards: {
                points: 25,
                viralBonus: shareData.viralScore > 7 ? 50 : 0,
                nextGoal: 'Share to 3 more platforms for achievement unlock!'
            },
            tip: 'The more you share, the more viral the ROJO revolution becomes! 🔥'
        });

    } catch (error) {
        console.error('❌ Viral share error:', error);
        res.status(500).json({
            error: 'Unable to process viral share',
            message: 'The revolution hit a temporary obstacle'
        });
    }
});

// Create group purchase
app.post('/api/viral/group-purchase', (req, res) => {
    try {
        const { leaderId, friendIds, productType, basePrice } = req.body;
        
        if (!leaderId || !friendIds || !Array.isArray(friendIds)) {
            return res.status(400).json({
                error: 'Missing required fields: leaderId, friendIds (array)'
            });
        }

        const groupSize = friendIds.length + 1; // Include leader
        const discountPercentage = Math.min(groupSize * 5, 30); // Max 30% discount
        const discountedPrice = basePrice * (1 - discountPercentage / 100);
        
        const groupPurchaseId = crypto.randomUUID();
        const groupData = {
            id: groupPurchaseId,
            leaderId: leaderId,
            participants: [leaderId, ...friendIds],
            groupSize: groupSize,
            originalPrice: basePrice,
            discountPercentage: discountPercentage,
            finalPrice: discountedPrice,
            savings: (basePrice - discountedPrice) * groupSize,
            timestamp: new Date().toISOString()
        };

        viralAnalytics.groupPurchases.set(groupPurchaseId, groupData);
        
        // Add activity for leader
        socialEngine.addSocialActivity(leaderId, 'group_purchase', {
            groupSize: groupSize,
            savings: groupData.savings,
            discount: discountPercentage
        });

        // Add activity for participants  
        friendIds.forEach(friendId => {
            socialEngine.addSocialActivity(friendId, 'group_purchase', {
                role: 'participant',
                leaderId: leaderId,
                savings: basePrice - discountedPrice
            });
        });

        res.json({
            success: true,
            message: `🎉 Group purchase activated! ${discountPercentage}% discount for ${groupSize} ROJO rebels!`,
            groupPurchase: {
                id: groupPurchaseId,
                groupSize: groupSize,
                discount: `${discountPercentage}%`,
                pricePerPerson: discountedPrice,
                totalSavings: groupData.savings,
                viralBonus: 'This group purchase will be shared to all participants\' networks!'
            },
            nextSteps: {
                payment: 'Proceed to payment with group discount applied',
                sharing: 'Group purchase will auto-share to amplify viral reach',
                rewards: 'All participants get bonus points and achievements'
            }
        });

    } catch (error) {
        console.error('❌ Group purchase error:', error);
        res.status(500).json({
            error: 'Unable to create group purchase',
            message: 'Please try again'
        });
    }
});

// 🤝 SOCIAL CONNECTION ENDPOINTS

// Connect friends
app.post('/api/social/connect', (req, res) => {
    try {
        const { userId, friendId, connectionType } = req.body;
        
        if (!userId || !friendId) {
            return res.status(400).json({
                error: 'Missing required fields: userId and friendId'
            });
        }

        if (userId === friendId) {
            return res.status(400).json({
                error: 'Cannot connect to yourself',
                message: 'Invite a friend to join the ROJO rebellion!'
            });
        }

        socialEngine.connectFriends(userId, friendId);
        viralAnalytics.activeUsers.add(userId);
        viralAnalytics.activeUsers.add(friendId);

        const userFriends = socialEngine.getFriendNetwork(userId);
        
        res.json({
            success: true,
            message: '🤝 Friend connection successful! The ROJO network grows stronger!',
            connection: {
                userId: userId,
                friendId: friendId,
                connectionType: connectionType || 'friend',
                timestamp: new Date().toISOString()
            },
            networkStats: {
                totalFriends: userFriends.length,
                networkGrowth: '+1 rebel added to your network',
                viralPotential: `${userFriends.length * 2} potential new users through your network`
            },
            rewards: {
                points: 50,
                achievement: userFriends.length >= 5 ? 'Network Builder 🌐' : null
            },
            viralBonus: 'Friend connections unlock group discounts!'
        });

    } catch (error) {
        console.error('❌ Friend connection error:', error);
        res.status(500).json({
            error: 'Unable to connect friends',
            message: 'Please try again'
        });
    }
});

// Get viral analytics
app.get('/api/viral/analytics', (req, res) => {
    try {
        const metrics = viralAnalytics.getViralMetrics();
        const leaderboard = socialEngine.getLeaderboard();
        const recentActivity = socialEngine.getRecentActivity();

        res.json({
            success: true,
            analytics: {
                viral: metrics,
                leaderboard: leaderboard,
                recentActivity: recentActivity,
                socialInsights: {
                    totalConnections: Array.from(socialEngine.friendConnections.values())
                        .reduce((sum, friends) => sum + friends.size, 0) / 2,
                    avgFriendsPerUser: Array.from(socialEngine.friendConnections.values())
                        .reduce((sum, friends) => sum + friends.size, 0) / socialEngine.friendConnections.size || 0,
                    viralMomentum: metrics.viralCoefficient > 1 ? 'Exponential Growth! 🚀' : 'Building Momentum 📈'
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Analytics error:', error);
        res.status(500).json({
            error: 'Unable to fetch analytics',
            message: 'Please try again'
        });
    }
});

// Get user's friend network
app.get('/api/social/friends/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const friends = socialEngine.getFriendNetwork(userId);
        const friendsWithActivity = friends.map(friendId => ({
            userId: friendId,
            score: socialEngine.leaderboard.get(friendId) || 0,
            lastActivity: socialEngine.socialActivities
                .find(activity => activity.userId === friendId)?.timestamp || null
        }));

        res.json({
            success: true,
            userId: userId,
            friends: friendsWithActivity,
            totalFriends: friends.length,
            viralPotential: friends.length * 2.5, // Each friend can potentially bring 2.5 more users
            message: friends.length === 0 
                ? 'Invite friends to unlock group discounts!'
                : `You have ${friends.length} ROJO rebels in your network! 🔥`
        });

    } catch (error) {
        console.error('❌ Friend network error:', error);
        res.status(500).json({
            error: 'Unable to fetch friend network',
            message: 'Please try again'
        });
    }
});

// 🎮 GAMIFICATION ENDPOINTS

// Unlock achievement
app.post('/api/gamification/achievement', (req, res) => {
    try {
        const { userId, achievementType, metadata } = req.body;
        
        if (!userId || !achievementType) {
            return res.status(400).json({
                error: 'Missing required fields: userId, achievementType'
            });
        }

        const achievements = {
            first_payment: { title: '🔥 First ROJO Payment', points: 100, nftReward: true },
            viral_sharer: { title: '📱 Viral Sharer', points: 50, nftReward: false },
            group_leader: { title: '👑 Group Leader', points: 200, nftReward: true },
            friend_connector: { title: '🤝 Friend Connector', points: 75, nftReward: false },
            top_rebel: { title: '⭐ Top Rebel', points: 500, nftReward: true }
        };

        const achievement = achievements[achievementType];
        if (!achievement) {
            return res.status(400).json({
                error: 'Invalid achievement type'
            });
        }

        // Add to social activity
        socialEngine.addSocialActivity(userId, 'achievement_unlock', {
            achievementType: achievementType,
            title: achievement.title,
            points: achievement.points
        });

        res.json({
            success: true,
            message: `🎉 Achievement Unlocked: ${achievement.title}!`,
            achievement: {
                type: achievementType,
                title: achievement.title,
                points: achievement.points,
                nftReward: achievement.nftReward
            },
            viralBonus: 'Share your achievement to earn extra points!',
            nextGoal: 'Keep being rebellious to unlock more achievements!'
        });

    } catch (error) {
        console.error('❌ Achievement error:', error);
        res.status(500).json({
            error: 'Unable to unlock achievement',
            message: 'Please try again'
        });
    }
});

// Get leaderboard
app.get('/api/gamification/leaderboard', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = socialEngine.getLeaderboard(limit);
        
        res.json({
            success: true,
            leaderboard: leaderboard,
            message: leaderboard.length > 0 
                ? 'The ROJO rebellion is strong! 🔥'
                : 'Be the first ROJO rebel to claim the throne! 👑',
            competition: {
                nextUpdate: 'Leaderboard updates in real-time',
                rewards: 'Top rebels get exclusive NFTs and perks'
            }
        });

    } catch (error) {
        console.error('❌ Leaderboard error:', error);
        res.status(500).json({
            error: 'Unable to fetch leaderboard',
            message: 'Please try again'
        });
    }
});

// 🔧 ERROR HANDLING

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: 'The ROJO rebellion doesn\'t recognize this path',
        availableEndpoints: [
            'GET /',
            'GET /health',
            'POST /api/viral/share',
            'POST /api/viral/group-purchase',
            'POST /api/social/connect',
            'GET /api/viral/analytics',
            'GET /api/social/friends/:userId',
            'POST /api/gamification/achievement',
            'GET /api/gamification/leaderboard'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('💥 Unexpected error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: 'The ROJO rebellion encountered an unexpected challenge',
        tip: 'Try refreshing and conquering again!'
    });
});

// 🚀 START THE VIRAL REVOLUTION
app.listen(PORT, () => {
    console.log('\n🔴 ================================');
    console.log('🚀 ROJO VIRAL MINI-APP ONLINE!');
    console.log('🔴 ================================');
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
    console.log(`🔥 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n📊 VIRAL FEATURES ACTIVE:');
    console.log('   📱 Social sharing engine');
    console.log('   👥 Group purchase system');
    console.log('   🏆 Gamification & leaderboards');
    console.log('   📈 Real-time viral analytics');
    console.log('   🤝 Friend network tracking');
    console.log('\n🎯 INTEGRATION STATUS:');
    console.log('   ✅ Ready for ROJO ecosystem');
    console.log('   ✅ Base Mini-App compatible');
    console.log('   ✅ Social commerce optimized');
    console.log('   ✅ Viral distribution enabled');
    console.log('\n💡 SUCCESS METRICS TO TRACK:');
    console.log('   📊 Viral coefficient > 1.0');
    console.log('   🎮 User engagement rates');
    console.log('   💰 Group purchase adoption');
    console.log('   🌍 Social reach expansion');
    console.log('\n🔥 THE ROJO REBELLION BEGINS NOW! 🔥');
    console.log('🔴 ================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 ROJO Viral Mini-App shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 ROJO rebellion paused gracefully...');
    process.exit(0);
});