const { PrismaClient, Role, SubscriptionStatus, VisitStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FitFlow OS dev data...');

  // Clean up existing data (dev only!).
  // Use TRUNCATE ... CASCADE so we don't have to hand-maintain the deletion
  // order of every FK relationship. Lists every table from prisma/schema.prisma
  // (the @@map names). RESTART IDENTITY resets any sequences.
  console.log('Clearing existing data...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "gym_hours",
      "equipment_incidents",
      "trainer_ratings",
      "body_metrics",
      "bookings",
      "classes",
      "equipment",
      "xp_progress",
      "refresh_tokens",
      "user_achievements",
      "achievements",
      "visits",
      "user_subscriptions",
      "membership_types",
      "gym_zones",
      "users"
    RESTART IDENTITY CASCADE
  `);

  // Default opening hours: weekdays 08:00-21:00, Saturday 09:00-20:00,
  // Sunday closed. Admin can edit any of these via /admin/hours.
  console.log('Seeding gym hours...');
  const HOURS = [
    { dayOfWeek: 0, openMin: 0,   closeMin: 0,    isClosed: true },  // Sun closed
    { dayOfWeek: 1, openMin: 8*60, closeMin: 21*60, isClosed: false }, // Mon
    { dayOfWeek: 2, openMin: 8*60, closeMin: 21*60, isClosed: false },
    { dayOfWeek: 3, openMin: 8*60, closeMin: 21*60, isClosed: false },
    { dayOfWeek: 4, openMin: 8*60, closeMin: 21*60, isClosed: false },
    { dayOfWeek: 5, openMin: 8*60, closeMin: 21*60, isClosed: false },
    { dayOfWeek: 6, openMin: 9*60, closeMin: 20*60, isClosed: false }, // Sat
  ];
  await prisma.gymHours.createMany({ data: HOURS });

  // Create zones
  console.log('Creating gym zones...');
  const mainHall = await prisma.gymZone.create({
    data: {
      name: 'Main Hall',
      maxCapacity: 50,
      currentOccupancy: 0,
      positionX: 5, positionY: 10, width: 50, height: 60,
      color: '#22d3ee',
    },
  });

  const cardioZone = await prisma.gymZone.create({
    data: {
      name: 'Cardio Zone',
      maxCapacity: 30,
      currentOccupancy: 0,
      positionX: 60, positionY: 10, width: 35, height: 35,
      color: '#f472b6',
    },
  });

  const stretchZone = await prisma.gymZone.create({
    data: {
      name: 'Stretch & Yoga',
      maxCapacity: 20,
      currentOccupancy: 0,
      positionX: 60, positionY: 50, width: 35, height: 25,
      color: '#a78bfa',
    },
  });

  // Create membership types
  console.log('Creating membership types...');
  const unlimitedElite = await prisma.membershipType.create({
    data: {
      name: 'Unlimited Elite',
      durationDays: 30,
      visitsLimit: null,
      price: 79.99,
      accessibleZones: [mainHall.id, cardioZone.id],
    },
  });

  const tenVisitsPack = await prisma.membershipType.create({
    data: {
      name: '10 Visits Pack',
      durationDays: 60,
      visitsLimit: 10,
      price: 39.99,
      accessibleZones: [mainHall.id],
    },
  });

  // Create users
  console.log('Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const trainerPassword = await bcrypt.hash('trainer123', 10);
  const clientPassword = await bcrypt.hash('client123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@fitflow.local',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      profileData: { name: 'Admin User' },
    },
  });

  const trainer = await prisma.user.create({
    data: {
      email: 'trainer@fitflow.local',
      passwordHash: trainerPassword,
      role: Role.TRAINER,
      profileData: { name: 'Trainer Tina' },
    },
  });

  const client = await prisma.user.create({
    data: {
      email: 'client@fitflow.local',
      passwordHash: clientPassword,
      role: Role.CLIENT,
      profileData: { name: 'Client Carl' },
    },
  });

  // Bulk-create additional clients
  console.log('Creating additional clients...');
  const extraClients = [];
  const extraClientCount = 500;
  for (let i = 1; i <= extraClientCount; i++) {
    const email = `client${i}@fitflow.local`;
    const name = `Client ${i}`;
    const passwordHash = await bcrypt.hash(`client${i}pass`, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.CLIENT,
        profileData: { name },
      },
    });
    extraClients.push(user);
  }

  // Create subscriptions for main demo client
  console.log('Creating subscriptions...');
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const end = new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000);   // in 23 days

  const clientSubUnlimited = await prisma.userSubscription.create({
    data: {
      userId: client.id,
      typeId: unlimitedElite.id,
      startDate: start,
      endDate: end,
      remainingVisits: null,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  const oldStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const oldEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  await prisma.userSubscription.create({
    data: {
      userId: client.id,
      typeId: tenVisitsPack.id,
      startDate: oldStart,
      endDate: oldEnd,
      remainingVisits: 0,
      status: SubscriptionStatus.EXPIRED,
    },
  });

  // ---------- realistic visit-time generator ----------
  // Mirrors the GymHours seed: weekdays 08-21, Sat 09-20, Sun closed.
  // Adds a peak-hour bias around morning (08-10) and evening (17-20) so the
  // dashboard's "visits by hour" chart doesn't look like uniform noise.
  const OPEN_BY_DAY = { 0: null, 1: [8,21], 2: [8,21], 3: [8,21], 4: [8,21], 5: [8,21], 6: [9,20] };
  function pickVisitTime(now, maxDaysAgo) {
    for (let i = 0; i < 12; i++) {
      const daysAgo = Math.floor(Math.random() * maxDaysAgo);
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      const range = OPEN_BY_DAY[d.getDay()];
      if (!range) continue;                              // Sunday — skip
      const [open, close] = range;
      // 65% peak, 35% mid-day
      let hour;
      if (Math.random() < 0.65) {
        hour = Math.random() < 0.5
          ? open + Math.floor(Math.random() * 3)          // morning peak
          : Math.max(open, close - 4) + Math.floor(Math.random() * 3); // evening peak
      } else {
        hour = open + Math.floor(Math.random() * (close - open - 1));
      }
      if (hour >= close) hour = close - 1;
      d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      return d;
    }
    const d = new Date(now); d.setHours(12, 0, 0, 0); return d;
  }

  console.log('Creating sample visits for main client...');
  const visitsData = [];
  for (let i = 0; i < 10; i++) {
    const checkIn  = pickVisitTime(now, 7);
    const checkOut = new Date(checkIn.getTime() + 60 * 60 * 1000); // +1h
    const durationMin = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
    visitsData.push({
      userId: client.id,
      subscriptionId: clientSubUnlimited.id,
      zoneId: i % 2 === 0 ? mainHall.id : cardioZone.id,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      durationMin,
      status: VisitStatus.COMPLETED,
    });
  }

  // Create subscriptions and visits for extra clients
  console.log('Creating subscriptions and visits for extra clients...');
  for (const extra of extraClients) {
    const offsetDays = Math.floor(Math.random() * 20); // 0-19 days ago
    const subStart = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
    const subEnd = new Date(subStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub = await prisma.userSubscription.create({
      data: {
        userId: extra.id,
        typeId: unlimitedElite.id,
        startDate: subStart,
        endDate: subEnd,
        remainingVisits: null,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const visitCount = Math.floor(Math.random() * 15); // 0-14 visits
    for (let i = 0; i < visitCount; i++) {
      const checkIn       = pickVisitTime(now, 30);
      const durationHours = 1 + Math.floor(Math.random() * 2); // 1-2h
      const checkOut      = new Date(checkIn.getTime() + durationHours * 60 * 60 * 1000);
      const durationMin   = durationHours * 60;
      const zoneId        = Math.random() < 0.6 ? mainHall.id : cardioZone.id;

      visitsData.push({
        userId: extra.id,
        subscriptionId: sub.id,
        zoneId,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        durationMin,
        status: VisitStatus.COMPLETED,
      });
    }
  }

  await prisma.visit.createMany({ data: visitsData });

  // Create equipment
  console.log('Creating equipment...');
  await prisma.equipment.createMany({
    data: [
      {
        name: 'Treadmill A1',
        type: 'CARDIO',
        status: 'ACTIVE',
        serialNumber: 'TRD-A1',
        lastServiceAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        nextServiceAt: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Treadmill A2',
        type: 'CARDIO',
        status: 'NEEDS_SERVICE',
        serialNumber: 'TRD-A2',
        lastServiceAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
        nextServiceAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Bench Press B1',
        type: 'STRENGTH',
        status: 'ACTIVE',
        serialNumber: 'BNCH-B1',
      },
      {
        name: 'Rowing Machine R1',
        type: 'CARDIO',
        status: 'ACTIVE',
        serialNumber: 'ROW-R1',
      },
    ],
  });

  // A couple of seeded incidents so the admin inbox isn't empty on first load.
  console.log('Seeding equipment incidents...');
  const broken = await prisma.equipment.findFirst({ where: { name: 'Treadmill A2' } });
  if (broken) {
    await prisma.equipmentIncident.create({
      data: {
        equipmentId: broken.id,
        reportedById: trainer.id,
        severity: 'HIGH',
        status: 'OPEN',
        note: 'Belt slips under load — needs immediate inspection.',
      },
    });
    // Flip it visibly to NEEDS_REPAIR
    await prisma.equipment.update({
      where: { id: broken.id },
      data: { status: 'NEEDS_REPAIR' },
    });
  }
  const bench = await prisma.equipment.findFirst({ where: { name: 'Bench Press B1' } });
  if (bench) {
    await prisma.equipmentIncident.create({
      data: {
        equipmentId: bench.id,
        reportedById: client.id,
        severity: 'LOW',
        status: 'IN_PROGRESS',
        note: 'Cushion is starting to tear on the right side.',
      },
    });
  }

  // Create classes
  console.log('Creating sample classes...');
  const upcomingStart = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  upcomingStart.setHours(18, 0, 0, 0);
  const upcomingEnd = new Date(upcomingStart.getTime() + 60 * 60 * 1000);

  const hiitClass = await prisma.class.create({
    data: {
      title: 'Evening HIIT',
      description: 'High intensity interval training to boost your cardio.',
      trainerId: trainer.id,
      zoneId: cardioZone.id,
      startTime: upcomingStart,
      endTime: upcomingEnd,
      capacity: 20,
    },
  });

  const yogaStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  yogaStart.setHours(7, 0, 0, 0);
  const yogaEnd = new Date(yogaStart.getTime() + 60 * 60 * 1000);
  await prisma.class.create({
    data: {
      title: 'Morning Yoga Flow',
      description: 'Gentle vinyasa sequence to start your day.',
      trainerId: trainer.id,
      zoneId: mainHall.id,
      startTime: yogaStart,
      endTime: yogaEnd,
      capacity: 15,
    },
  });

  // Seed some bookings for HIIT class
  console.log('Creating sample class bookings...');
  const sampleBookers = extraClients.slice(0, 10);
  await prisma.booking.createMany({
    data: sampleBookers.map((u) => ({
      userId: u.id,
      classId: hiitClass.id,
      status: 'CONFIRMED',
    })),
  });

  // Create achievements
  console.log('Creating achievements...');
  const firstVisit = await prisma.achievement.create({
    data: {
      name: 'First Visit',
      icon: 'star',
      description: 'Completed your first workout at the gym.',
    },
  });

  const consistencyKing = await prisma.achievement.create({
    data: {
      name: 'Consistency King',
      icon: 'flame',
      description: 'Visited the gym 10 times in a month.',
    },
  });

  await prisma.userAchievement.createMany({
    data: [
      {
        userId: client.id,
        achievementId: firstVisit.id,
      },
      {
        userId: client.id,
        achievementId: consistencyKing.id,
      },
    ],
  });

  // Body metrics history for main client (weekly weigh-ins, last ~10 weeks)
  console.log('Creating body metrics history...');
  const metricsData = [];
  let weight = 84.5;
  let waist = 92;
  for (let i = 9; i >= 0; i--) {
    const recordedAt = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weight -= 0.3 + Math.random() * 0.4;
    waist -= 0.2 + Math.random() * 0.3;
    metricsData.push({
      userId: client.id,
      recordedAt,
      weightKg:   +weight.toFixed(1),
      waistCm:    +waist.toFixed(1),
      chestCm:    +(102 - i * 0.1).toFixed(1),
      bodyFatPct: +(22 - i * 0.2).toFixed(1),
    });
  }
  await prisma.bodyMetric.createMany({ data: metricsData });

  // A couple of trainer ratings on the past HIIT booker subset (synthetic past class)
  console.log('Creating trainer ratings...');
  const ratedClass = await prisma.class.create({
    data: {
      title: 'Last Week HIIT',
      description: 'Past class used for ratings demo.',
      trainerId: trainer.id,
      zoneId: cardioZone.id,
      startTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      endTime:   new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      capacity: 20,
    },
  });
  await prisma.trainerRating.createMany({
    data: sampleBookers.slice(0, 6).map((u, i) => ({
      classId: ratedClass.id,
      trainerId: trainer.id,
      raterId: u.id,
      stars: 4 + (i % 2), // mix of 4s and 5s
      comment: i === 0 ? 'Killer session, loved it!' : null,
    })),
  });

  // Streak demo for main client — 5 consecutive days ending today
  console.log('Seeding streak progress for main client...');
  const today = new Date(now); today.setHours(0,0,0,0);
  await prisma.xpProgress.upsert({
    where: { userId: client.id },
    create: {
      userId: client.id,
      level: 4,
      xpTotal: 620,
      xpThisLevel: 40,
      xpToNextLevel: 200,
      currentStreak: 5,
      longestStreak: 12,
      lastVisitDate: today,
    },
    update: {
      currentStreak: 5,
      longestStreak: 12,
      lastVisitDate: today,
    },
  });

  console.log('Seeding complete.');
  console.log('Admin login:   admin@fitflow.local / admin123');
  console.log('Trainer login: trainer@fitflow.local / trainer123');
  console.log('Client login:  client@fitflow.local / client123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
