const db = firebase.firestore();

let dbSnapshot = [];


async function db_getUserSnapshot() {
    let user = firebase.auth().currentUser;
    if (user == null) return false;
    let ret = [];
    // await db.collection('results')
    //     .orderBy('timestamp', 'desc')
    //     .where('uid', '==', user.uid)
    //     .get()
    //     .then(data => {
    //         // console.log('getting data from db!');
    //         data.docs.forEach(doc => {
    //             ret.push(doc.data());
    //         })
    //     })
    await db.collection(`users/${user.uid}/results/`)
        .orderBy('timestamp', 'desc')
        .get()
        .then(data => {
            // console.log('getting data from db!');
            data.docs.forEach(doc => {
                ret.push(doc.data());
            })
        })
    dbSnapshot = ret;
    return ret;
}

async function db_getUserHighestWpm(mode, mode2, punctuation, language, difficulty) {

    function cont() {   
        let topWpm = 0;
        dbSnapshot.forEach(result => {
            if (result.mode == mode && result.mode2 == mode2 && result.punctuation == punctuation && result.language == language && result.difficulty == difficulty) {
                if (result.wpm > topWpm) {
                    topWpm = result.wpm;
                }
            }
        })
        return topWpm;
    }

    let retval;
    if (dbSnapshot == null) {
        // await db_getUserResults().then(data => {
        //     retval = cont();
        // });
    } else {
        retval = cont();
    }
    return retval;

}
