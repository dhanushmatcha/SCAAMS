const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');

dotenv.config();

const NEW_PASSWORD = 'faculty123';
const facultyMap = [
  { id: 1, oldEmail: 'raghavendra.cse@college.edu' },
  { id: 2, oldEmail: 'pavan.kumar.cse0@college.edu' },
  { id: 3, oldEmail: 'harish.kumar.cse1@college.edu' },
  { id: 4, oldEmail: 'yashwanth.kumar.cse2@college.edu' },
  { id: 5, oldEmail: 'sai.kumar.cseap0@college.edu' },
  { id: 6, oldEmail: 'santosh.rao.cseap1@college.edu' },
  { id: 7, oldEmail: 'pavan.kumar.cseap2@college.edu' },
  { id: 8, oldEmail: 'madhava.reddy.cseap3@college.edu' },
  { id: 9, oldEmail: 'rajani.cseas0@college.edu' },
  { id: 10, oldEmail: 'annapurna.cseas1@college.edu' },
  { id: 11, oldEmail: 'charulatha.cseas2@college.edu' },
  { id: 12, oldEmail: 'indira.cseas3@college.edu' },
  { id: 13, oldEmail: 'chandra.mohan.cseas4@college.edu' },
  { id: 14, oldEmail: 'lakshman.rao.cseas5@college.edu' },
  { id: 15, oldEmail: 'charulatha.cselab0@college.edu' },
  { id: 16, oldEmail: 'annapurna.cselab1@college.edu' },
  { id: 17, oldEmail: 'radhika.cseta0@college.edu' },
  { id: 18, oldEmail: 'srinivas.reddy.ece@college.edu' },
  { id: 19, oldEmail: 'dinesh.kumar.ece0@college.edu' },
  { id: 20, oldEmail: 'phani.kumar.ece1@college.edu' },
  { id: 21, oldEmail: 'lakshman.rao.ece2@college.edu' },
  { id: 22, oldEmail: 'raghavendra.eceap0@college.edu' },
  { id: 23, oldEmail: 'arun.kumar.eceap1@college.edu' },
  { id: 24, oldEmail: 'yashwanth.kumar.eceap2@college.edu' },
  { id: 25, oldEmail: 'quddus.ali.eceap3@college.edu' },
  { id: 26, oldEmail: 'charulatha.eceas0@college.edu' },
  { id: 27, oldEmail: 'kalyani.eceas1@college.edu' },
  { id: 28, oldEmail: 'priyanka.eceas2@college.edu' },
  { id: 29, oldEmail: 'padmaja.eceas3@college.edu' },
  { id: 30, oldEmail: 'deepika.eceas4@college.edu' },
  { id: 31, oldEmail: 'bharathi.eceas5@college.edu' },
  { id: 32, oldEmail: 'prakash.reddy.ecelab0@college.edu' },
  { id: 33, oldEmail: 'rohit.reddy.ecelab1@college.edu' },
  { id: 34, oldEmail: 'shiva.kumar.eceta0@college.edu' },
  { id: 35, oldEmail: 'vijay.kumar.eee@college.edu' },
  { id: 36, oldEmail: 'prasad.rao.eee0@college.edu' },
  { id: 37, oldEmail: 'arun.kumar.eee1@college.edu' },
  { id: 38, oldEmail: 'quddus.ali.eee2@college.edu' },
  { id: 39, oldEmail: 'zeenath.ali.eeeap0@college.edu' },
  { id: 40, oldEmail: 'arun.kumar.eeeap1@college.edu' },
  { id: 41, oldEmail: 'anand.rao.eeeap2@college.edu' },
  { id: 42, oldEmail: 'pavan.kumar.eeeap3@college.edu' },
  { id: 43, oldEmail: 'neha.eeeas0@college.edu' },
  { id: 44, oldEmail: 'krishna.murthy.eeeas1@college.edu' },
  { id: 45, oldEmail: 'raghavendra.eeeas2@college.edu' },
  { id: 46, oldEmail: 'divya.eeeas3@college.edu' },
  { id: 47, oldEmail: 'yamuna.eeeas4@college.edu' },
  { id: 48, oldEmail: 'vijay.kumar.eeeas5@college.edu' },
  { id: 49, oldEmail: 'rashmi.eeelab0@college.edu' },
  { id: 50, oldEmail: 'meenakshi.eeelab1@college.edu' },
  { id: 51, oldEmail: 'pooja.eeeta0@college.edu' },
  { id: 52, oldEmail: 'phani.kumar.mech@college.edu' },
  { id: 53, oldEmail: 'ravi.kumar.mech0@college.edu' },
  { id: 54, oldEmail: 'naveen.kumar.mech1@college.edu' },
  { id: 55, oldEmail: 'srinivas.reddy.mech2@college.edu' },
  { id: 56, oldEmail: 'lakshman.rao.mechap0@college.edu' },
  { id: 57, oldEmail: 'chandra.mohan.mechap1@college.edu' },
  { id: 58, oldEmail: 'mohan.kumar.mechap2@college.edu' },
  { id: 59, oldEmail: 'santosh.rao.mechap3@college.edu' },
  { id: 60, oldEmail: 'geetha.mechas0@college.edu' },
  { id: 61, oldEmail: 'teja.kumar.mechas1@college.edu' },
  { id: 62, oldEmail: 'mohan.kumar.mechas2@college.edu' },
  { id: 63, oldEmail: 'mahesh.reddy.mechas3@college.edu' },
  { id: 64, oldEmail: 'shalini.mechas4@college.edu' },
  { id: 65, oldEmail: 'divya.mechas5@college.edu' },
  { id: 66, oldEmail: 'meenakshi.mechlab0@college.edu' },
  { id: 67, oldEmail: 'zeenath.ali.mechlab1@college.edu' },
  { id: 68, oldEmail: 'charulatha.mechta0@college.edu' },
  { id: 69, oldEmail: 'madhava.reddy.civil@college.edu' },
  { id: 70, oldEmail: 'raghavendra.civil0@college.edu' },
  { id: 71, oldEmail: 'chandrasekhar.civil1@college.edu' },
  { id: 72, oldEmail: 'dinesh.kumar.civil2@college.edu' },
  { id: 73, oldEmail: 'chandra.mohan.civilap0@college.edu' },
  { id: 74, oldEmail: 'teja.kumar.civilap1@college.edu' },
  { id: 75, oldEmail: 'harish.kumar.civilap2@college.edu' },
  { id: 76, oldEmail: 'teja.kumar.civilap3@college.edu' },
  { id: 77, oldEmail: 'padmaja.civilas0@college.edu' },
  { id: 78, oldEmail: 'jayashree.civilas1@college.edu' },
  { id: 79, oldEmail: 'madhavi.civilas2@college.edu' },
  { id: 80, oldEmail: 'meera.civilas3@college.edu' },
  { id: 81, oldEmail: 'priyanka.civilas4@college.edu' },
  { id: 82, oldEmail: 'deepika.civilas5@college.edu' },
  { id: 83, oldEmail: 'geetha.civillab0@college.edu' },
  { id: 84, oldEmail: 'nagarjuna.civillab1@college.edu' },
  { id: 85, oldEmail: 'indira.civilta0@college.edu' },
  { id: 86, oldEmail: 'gopal.reddy.it@college.edu' },
  { id: 87, oldEmail: 'quddus.ali.it0@college.edu' },
  { id: 88, oldEmail: 'krishna.murthy.it1@college.edu' },
  { id: 89, oldEmail: 'vikram.reddy.it2@college.edu' },
  { id: 90, oldEmail: 'om.prakash.itap0@college.edu' },
  { id: 91, oldEmail: 'lakshman.rao.itap1@college.edu' },
  { id: 92, oldEmail: 'karthik.kumar.itap2@college.edu' },
  { id: 93, oldEmail: 'krishna.murthy.itap3@college.edu' },
  { id: 94, oldEmail: 'anita.itas0@college.edu' },
  { id: 95, oldEmail: 'siddharth.reddy.itas1@college.edu' },
  { id: 96, oldEmail: 'pooja.itas2@college.edu' },
  { id: 97, oldEmail: 'saritha.itas3@college.edu' },
  { id: 98, oldEmail: 'vasudha.itas4@college.edu' },
  { id: 99, oldEmail: 'karthik.kumar.itas5@college.edu' },
  { id: 100, oldEmail: 'umesh.rao.itlab0@college.edu' },
  { id: 101, oldEmail: 'vamsi.reddy.itlab1@college.edu' },
  { id: 102, oldEmail: 'umesh.rao.itta0@college.edu' }
];

const restoreFacultyEmails = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    console.log(`Restoring ${facultyMap.length} faculty email addresses and setting password to '${NEW_PASSWORD}'`);

    for (const item of facultyMap) {
      const currentEmail = `faculty${item.id}@college.edu`;
      const user = await User.findOne({ role: 'Faculty', email: currentEmail });
      if (!user) {
        console.warn(`Skipped: no faculty found with email ${currentEmail}`);
        continue;
      }

      user.email = item.oldEmail;
      user.password = hashedPassword;
      await user.save();
      console.log(`Restored ${currentEmail} -> ${item.oldEmail}`);
    }

    console.log('Restore complete. All faculty emails are back to original addresses.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error restoring faculty emails:', error);
    process.exit(1);
  }
};

restoreFacultyEmails();
