import { PrismaClient, UserRole, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('123456', saltRounds);

  console.log('开始创建种子数据...');

  // 1. 创建管理员
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      realName: '系统管理员',
      role: UserRole.ADMIN,
    },
  });
  console.log('管理员创建完成:', admin.username);

  // 2. 创建科室
  const departments = [
    { name: '内科', description: '主要诊治呼吸系统、消化系统、心血管系统等内科疾病', icon: 'internal', sortOrder: 1 },
    { name: '外科', description: '开展各类手术治疗，包括普外科、骨科等', icon: 'surgery', sortOrder: 2 },
    { name: '儿科', description: '专门诊治儿童疾病，关注儿童健康成长', icon: 'pediatrics', sortOrder: 3 },
    { name: '妇科', description: '女性健康专科，包括妇科疾病诊治和产检', icon: 'gynecology', sortOrder: 4 },
    { name: '眼科', description: '眼部疾病诊治，视力检查和配镜咨询', icon: 'ophthalmology', sortOrder: 5 },
  ];

  const createdDepartments = [];
  for (const dept of departments) {
    const department = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
    createdDepartments.push(department);
    console.log('科室创建完成:', department.name);
  }

  // 3. 创建医生（每个科室2个）
  const doctorData = [
    // 内科
    { username: 'doctor_li', realName: '李明华', title: '主任医师', specialty: '心血管疾病、高血压、冠心病', introduction: '从医30年，擅长心血管疾病的诊断和治疗，发表论文20余篇。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20male%20doctor%20portrait%20in%20white%20coat%20middle%20aged&image_size=square', deptIndex: 0 },
    { username: 'doctor_wang', realName: '王秀芬', title: '副主任医师', specialty: '呼吸系统疾病、哮喘、肺炎', introduction: '擅长呼吸系统疾病的诊治，对哮喘、慢性支气管炎有丰富经验。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20female%20doctor%20portrait%20in%20white%20coat&image_size=square', deptIndex: 0 },
    // 外科
    { username: 'doctor_zhang', realName: '张伟强', title: '主任医师', specialty: '普外科、胃肠手术、疝气修补', introduction: '外科专家，精通各类普外科手术，手术成功率高。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20male%20surgeon%20portrait%20serious%20expression&image_size=square', deptIndex: 1 },
    { username: 'doctor_liu', realName: '刘建国', title: '副主任医师', specialty: '骨科、关节置换、骨折治疗', introduction: '骨科专家，擅长骨折治疗和关节置换手术。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20male%20orthopedic%20doctor%20portrait&image_size=square', deptIndex: 1 },
    // 儿科
    { username: 'doctor_chen', realName: '陈小红', title: '主任医师', specialty: '小儿感染、新生儿疾病、儿童保健', introduction: '儿科专家，对儿童常见病、多发病有丰富的诊疗经验。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20female%20pediatrician%20portrait%20smiling&image_size=square', deptIndex: 2 },
    { username: 'doctor_zhao', realName: '赵晓燕', title: '副主任医师', specialty: '小儿呼吸系统疾病、过敏性疾病', introduction: '擅长小儿哮喘、过敏性鼻炎等疾病的诊治。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20female%20pediatric%20doctor%20portrait&image_size=square', deptIndex: 2 },
    // 妇科
    { username: 'doctor_sun', realName: '孙美玲', title: '主任医师', specialty: '妇科肿瘤、微创手术、不孕不育', introduction: '妇科专家，擅长妇科微创手术和不孕不育诊治。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=experienced%20female%20gynecologist%20portrait&image_size=square', deptIndex: 3 },
    { username: 'doctor_zhou', realName: '周丽华', title: '副主任医师', specialty: '产前检查、高危妊娠、妇科炎症', introduction: '擅长产前检查和高危妊娠管理，深受患者信赖。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20female%20obstetrician%20portrait&image_size=square', deptIndex: 3 },
    // 眼科
    { username: 'doctor_wu', realName: '吴光明', title: '主任医师', specialty: '白内障、青光眼、近视手术', introduction: '眼科专家，成功完成白内障手术数千例。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20male%20ophthalmologist%20portrait&image_size=square', deptIndex: 4 },
    { username: 'doctor_huang', realName: '黄雅琴', title: '副主任医师', specialty: '儿童视力保健、斜视弱视、验光配镜', introduction: '擅长儿童视力保健和斜视弱视的矫正治疗。', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=female%20optometrist%20portrait%20friendly&image_size=square', deptIndex: 4 },
  ];

  const createdDoctors = [];
  for (const doc of doctorData) {
    const user = await prisma.user.upsert({
      where: { username: doc.username },
      update: {},
      create: {
        username: doc.username,
        password: hashedPassword,
        realName: doc.realName,
        role: UserRole.DOCTOR,
        avatar: doc.avatar,
      },
    });

    const doctor = await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        departmentId: createdDepartments[doc.deptIndex].id,
        title: doc.title,
        specialty: doc.specialty,
        introduction: doc.introduction,
        avatar: doc.avatar,
      },
    });
    createdDoctors.push({ user, doctor });
    console.log('医生创建完成:', doc.realName);
  }

  // 4. 创建排班（为每个医生创建排班）
  const weekDays = [1, 2, 3, 4, 5]; // 周一到周五
  const timeSlots = [
    { startTime: '08:00', endTime: '08:30' },
    { startTime: '08:30', endTime: '09:00' },
    { startTime: '09:00', endTime: '09:30' },
    { startTime: '09:30', endTime: '10:00' },
    { startTime: '10:00', endTime: '10:30' },
    { startTime: '10:30', endTime: '11:00' },
    { startTime: '14:00', endTime: '14:30' },
    { startTime: '14:30', endTime: '15:00' },
    { startTime: '15:00', endTime: '15:30' },
    { startTime: '15:30', endTime: '16:00' },
  ];

  const createdSchedules = [];
  for (const doc of createdDoctors) {
    for (const weekDay of weekDays) {
      const slotsPerDay = weekDay % 2 === 1 ? 4 : 3; // 隔天排班
      const selectedSlots = timeSlots.slice(0, slotsPerDay);
      
      for (const slot of selectedSlots) {
        const schedule = await prisma.schedule.create({
          data: {
            doctorId: doc.doctor.id,
            weekDay,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxAppointments: 5,
          },
        });
        createdSchedules.push(schedule);
      }
    }
  }
  console.log('排班创建完成，共', createdSchedules.length, '条排班记录');

  // 5. 创建患者
  const patientData = [
    { username: 'patient_zhang', realName: '张三', phone: '13800138001', age: 35, gender: '男' },
    { username: 'patient_li', realName: '李四', phone: '13800138002', age: 28, gender: '女' },
    { username: 'patient_wang', realName: '王五', phone: '13800138003', age: 45, gender: '男' },
    { username: 'patient_zhao', realName: '赵六', phone: '13800138004', age: 32, gender: '女' },
    { username: 'patient_qian', realName: '钱七', phone: '13800138005', age: 50, gender: '男' },
  ];

  const createdPatients = [];
  for (const pat of patientData) {
    const user = await prisma.user.upsert({
      where: { username: pat.username },
      update: {},
      create: {
        username: pat.username,
        password: hashedPassword,
        realName: pat.realName,
        phone: pat.phone,
        role: UserRole.PATIENT,
      },
    });

    const patient = await prisma.patient.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        age: pat.age,
        gender: pat.gender,
      },
    });
    createdPatients.push({ user, patient });
    console.log('患者创建完成:', pat.realName);
  }

  // 6. 创建预约记录（15条）
  const today = new Date();
  const appointments = [];
  
  const appointmentData = [
    { patientIndex: 0, doctorIndex: 0, status: AppointmentStatus.COMPLETED, daysAgo: 7, symptoms: '胸闷、心悸，活动后加重' },
    { patientIndex: 0, doctorIndex: 0, status: AppointmentStatus.COMPLETED, daysAgo: 14, symptoms: '头晕、头痛，血压偏高' },
    { patientIndex: 1, doctorIndex: 2, status: AppointmentStatus.COMPLETED, daysAgo: 5, symptoms: '腹痛、腹泻2天' },
    { patientIndex: 1, doctorIndex: 9, status: AppointmentStatus.COMPLETED, daysAgo: 10, symptoms: '双眼干涩、视力下降' },
    { patientIndex: 2, doctorIndex: 4, status: AppointmentStatus.COMPLETED, daysAgo: 3, symptoms: '发热、咳嗽3天' },
    { patientIndex: 2, doctorIndex: 6, status: AppointmentStatus.COMPLETED, daysAgo: 20, symptoms: '外阴瘙痒、白带异常' },
    { patientIndex: 3, doctorIndex: 1, status: AppointmentStatus.CONFIRMED, daysAgo: -1, symptoms: '反复咳嗽、咳痰1周' },
    { patientIndex: 3, doctorIndex: 3, status: AppointmentStatus.PENDING, daysAgo: -2, symptoms: '右膝关节疼痛，活动受限' },
    { patientIndex: 4, doctorIndex: 5, status: AppointmentStatus.IN_PROGRESS, daysAgo: 0, symptoms: '鼻塞、流涕、打喷嚏' },
    { patientIndex: 0, doctorIndex: 7, status: AppointmentStatus.CONFIRMED, daysAgo: -3, symptoms: '月经不调、痛经' },
    { patientIndex: 1, doctorIndex: 8, status: AppointmentStatus.CANCELLED, daysAgo: 1, symptoms: '眼睛红肿、疼痛', rejectReason: '患者自行取消' },
    { patientIndex: 2, doctorIndex: 0, status: AppointmentStatus.PENDING, daysAgo: -5, symptoms: '活动后气促、乏力' },
    { patientIndex: 3, doctorIndex: 4, status: AppointmentStatus.COMPLETED, daysAgo: 8, symptoms: '小儿发热、哭闹不安' },
    { patientIndex: 4, doctorIndex: 2, status: AppointmentStatus.COMPLETED, daysAgo: 12, symptoms: '阑尾炎术后复查' },
    { patientIndex: 0, doctorIndex: 1, status: AppointmentStatus.COMPLETED, daysAgo: 15, symptoms: '慢性支气管炎急性发作' },
  ];

  for (let i = 0; i < appointmentData.length; i++) {
    const data = appointmentData[i];
    const appointmentDate = new Date(today);
    appointmentDate.setDate(appointmentDate.getDate() - data.daysAgo);

    const doctor = createdDoctors[data.doctorIndex];
    const schedule = createdSchedules.find(s => s.doctorId === doctor.doctor.id);

    const appointment = await prisma.appointment.create({
      data: {
        patientId: createdPatients[data.patientIndex].patient.id,
        doctorId: doctor.doctor.id,
        scheduleId: schedule?.id,
        appointmentDate,
        startTime: schedule?.startTime || '08:00',
        endTime: schedule?.endTime || '08:30',
        symptoms: data.symptoms,
        status: data.status,
        rejectReason: data.rejectReason,
      },
    });
    appointments.push({ appointment, data, doctor, patientIndex: data.patientIndex });
    console.log('预约创建完成:', appointment.id, '- 状态:', data.status);

    // 为已完成的预约创建问诊记录和评价
    if (data.status === AppointmentStatus.COMPLETED) {
      // 创建问诊记录
      const medicalRecordContents = [
        { chiefComplaint: '胸闷、心悸1周', diagnosis: '冠心病、高血压', prescription: '阿司匹林 100mg qd; 阿托伐他汀 20mg qn; 氨氯地平 5mg qd', advice: '定期监测血压，避免剧烈运动，低盐低脂饮食' },
        { chiefComplaint: '头晕、头痛3天', diagnosis: '原发性高血压3级', prescription: '缬沙坦 80mg qd; 氢氯噻嗪 25mg qd', advice: '每日监测血压2次，保持情绪稳定' },
        { chiefComplaint: '腹痛、腹泻2天', diagnosis: '急性胃肠炎', prescription: '蒙脱石散 3g tid; 左氧氟沙星 0.5g qd', advice: '清淡饮食，多饮水，注意休息' },
        { chiefComplaint: '双眼干涩、视力下降', diagnosis: '干眼症、视疲劳', prescription: '玻璃酸钠滴眼液 qid; 七叶洋地黄双苷滴眼液 tid', advice: '减少电子屏幕使用时间，定时休息眼睛' },
        { chiefComplaint: '发热、咳嗽3天', diagnosis: '急性上呼吸道感染', prescription: '布洛芬 0.3g prn; 氨溴索 30mg tid; 头孢克洛 0.25g tid', advice: '多饮水，体温超过38.5度服用退烧药' },
        { chiefComplaint: '外阴瘙痒、白带异常1周', diagnosis: '外阴阴道假丝酵母菌病', prescription: '克霉唑栓 1粒 qn x 7天; 碳酸氢钠溶液 外阴冲洗 bid', advice: '注意个人卫生，内裤勤换洗暴晒' },
        { chiefComplaint: '小儿发热2天', diagnosis: '急性扁桃体炎', prescription: '布洛芬混悬液 按需使用; 头孢克洛干混悬剂 按体重服用', advice: '物理降温，多饮水，监测体温' },
        { chiefComplaint: '阑尾炎术后1周复查', diagnosis: '阑尾炎术后恢复期', prescription: '无特殊用药', advice: '注意休息，逐渐恢复正常饮食，如有不适随诊' },
        { chiefComplaint: '反复咳嗽1周', diagnosis: '慢性支气管炎急性发作', prescription: '头孢呋辛 0.25g bid; 氨溴索 30mg tid; 茶碱缓释片 0.1g bid', advice: '戒烟，避免受凉，增强体质' },
      ];

      const recordContent = medicalRecordContents[i % medicalRecordContents.length];
      await prisma.medicalRecord.create({
        data: {
          appointmentId: appointment.id,
          patientId: createdPatients[data.patientIndex].patient.id,
          doctorId: doctor.doctor.id,
          ...recordContent,
        },
      });
      console.log('  问诊记录创建完成');

      // 创建评价（部分预约有评价）
      if (i % 2 === 0) {
        const ratings = [5, 4, 5, 5, 4];
        const comments = [
          '医生态度很好，很有耐心，解释得很清楚，治疗效果也不错。',
          '等候时间有点长，但医生还是很专业的，给的建议很实用。',
          '非常满意！医生经验丰富，一下子就找到了问题所在，现在已经好多了。',
          '医生很负责任，详细询问了病史，开的药也很有效。',
          '整体不错，就是挂号有点难，希望能多放一些号源。',
        ];

        const rating = ratings[i % ratings.length];
        const comment = comments[i % comments.length];

        await prisma.review.create({
          data: {
            appointmentId: appointment.id,
            patientId: createdPatients[data.patientIndex].patient.id,
            doctorId: doctor.doctor.id,
            rating,
            content: comment,
          },
        });

        // 更新医生评分
        const doctorReviews = await prisma.review.findMany({
          where: { doctorId: doctor.doctor.id },
        });
        const avgRating = doctorReviews.reduce((sum, r) => sum + r.rating, 0) / doctorReviews.length;

        await prisma.doctor.update({
          where: { id: doctor.doctor.id },
          data: {
            rating: Math.round(avgRating * 10) / 10,
            reviewCount: doctorReviews.length,
          },
        });
        console.log('  评价创建完成，评分:', rating);
      }
    }
  }

  console.log('\n========================================');
  console.log('种子数据创建完成！');
  console.log('========================================');
  console.log('\n测试账号：');
  console.log('  管理员: admin / 123456');
  console.log('  医生: doctor_li ~ doctor_huang / 123456');
  console.log('  患者: patient_zhang ~ patient_qian / 123456');
  console.log('\n数据库: db_zj_60032');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
