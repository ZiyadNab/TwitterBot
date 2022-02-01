const Canvas = require("canvas")
const axios = require('axios')
const Twit = require("twit")
const moment = require('moment')
const admin = require("firebase-admin");
const serviceAccount = require("./Firebase/serviceAccountKey.json");
console.log('Twitter bot is online')

//Twitter OAuth keys
const consumer_key = "GAZJRCOiYJI9XYEoQdmde5T50"
const consumer_secret = "ARWFTYXrWURdhIcFsOYpNoZsbDvYmSw7FyV1O60VB0NingbeRZ"
const oauth_tokenFNBR_MENA = "1377237014983147533-DDibGQrrFieKEIGNWJdfBhCLtJ2iOZ"
const oauth_token_secretFNBR_MENA = "b2ddZsyeDY9AHKS2SXFM2hCbUOIJX71oIaZZhgNRyYE7i"
const oauth_tokenFNBRMENA = "1283462930101686273-A09dDHEhkRqlFahAJMpQpPdPn0Q6UJ"
const oauth_token_secretFNBRMENA = "uj40nWlpxWH3mGlr1Vochft1Fposqu9eByJNpFIQNkwRH"

//admin .login
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://twitter-bot-c542e-default-rtdb.firebaseio.com/"
})

//get account from database
var T;
admin.database().ref("Tokens").once('value', async function (data) {

    //auth
    if(data.val().FNBRMENA.Status){

        //inisilizing Twit
        T = new Twit({
            consumer_key:         consumer_key,
            consumer_secret:      consumer_secret,
            access_token:         data.val().FNBRMENA.OAuthToken,
            access_token_secret:  data.val().FNBRMENA.OAuthSecretToken,
        })

    }else if(data.val().FNBR_MENA.Status){

        //inisilizing Twit
        T = new Twit({
            consumer_key:         consumer_key,
            consumer_secret:      consumer_secret,
            access_token:         data.val().FNBR_MENA.OAuthToken,
            access_token_secret:  data.val().FNBR_MENA.OAuthSecretToken,
        })
    }
})

async function getBase64(url) {
    return axios.get(url, {
        responseType: 'arraybuffer'

      }).then(response =>
        Buffer.from(response.data, 'binary').toString('base64'))
}

const Blogposts = async () => {

    //result
    var blogs = []
    var response = []
    var number = 0

    //handle the blogs
    const BlogpostsEvents = async () => {

        //checking if the bot on or off
        admin.database().ref("Events").child("blogposts").once('value', async function (data) {
            const status = data.val().Active
            const lang = data.val().Lang
            const push = data.val().Push

            //if the event is set to be true [ON]
            if(status){

                //request data
                axios.get(`https://www.epicgames.com/fortnite/api/blog/getPosts?category=&postsPerPage=0&offset=0&rootPageSlug=blog&locale=${lang}`)
                .then(async res => {

                    //storing the first start up
                    if(number === 0){

                        //storing
                        for(let i = 0; i < res.data.blogList.length; i++){
                            blogs[i] = await res.data.blogList[i].slug
                        }

                        //stop from storing again
                        number++
                    }

                    //if push is enabled
                    if(push) blogs[0] = []

                    //storing the new blog to compare
                    for(let i = 0; i < res.data.blogList.length; i++){
                        response[i] = await res.data.blogList[i].slug
                    }

                    //check if there is a new blog
                    if(JSON.stringify(response) !== JSON.stringify(blogs)){

                        //new blog has been registerd lets find it
                        for(let i = 0; i < response.length; i++){
                            
                            //compare if its the index i includes or not
                            if(!blogs.includes(response[i])){

                                //filtering to get the new blog
                                var newBlog = await res.data.blogList.filter(blog => {
                                    return blog.slug === response[i]
                                })

                                //seting up the description
                                if(newBlog[0].shareDescription !== "" && newBlog[0].shareDescription !== undefined) var description = `- ${newBlog[0].shareDescription}`
                                else if(newBlog[0]._metaTags !== undefined){

                                    //add description variable
                                    var description = `- ${newBlog[0]._metaTags}`
                                    description = description.replace(description.substring(2, description.indexOf("<meta name=\"description\" content=\"")), "")
                                    description = description.replace('<meta name="description" content="', "")
                                    description = description.substring(0, description.indexOf("\">"))
                                    
                                }else var description = `- ${newBlog[0].title}`

                                //add the blog link
                                description += ` #فورتنايت\n\n• الرابط: https://www.epicgames.com/fortnite${newBlog[0].urlPattern}`

                                //set image
                                var url = ``
                                if(newBlog[0].shareImage !== undefined) url = newBlog[0].shareImage
                                else if(newBlog[0].trendingImage !== undefined) url = newBlog[0].trendingImage
                                else if(newBlog[0].image !== undefined) url = newBlog[0].image
                                else url = "https://i.imgur.com/Dg7jrFV.jpeg"

                                //
                                //  tweet the blogpost
                                //
                                T.post('media/upload', { media_data: await getBase64(url) }, function(err, data, response) {
                                    if(err) console.log(err)
                                    else{
                                        var mediaIdStr = data.media_id_string
                                    
                                        T.post('statuses/update', { status: description, media_ids: [mediaIdStr]}, function(err, data, response) {
                                            if(err) console.log(err)
                                        })
                                    }
                                })
                            }
                        }

                        //store the new data
                        for(let i = 0; i < res.data.blogList.length; i++){
                            blogs[i] = await res.data.blogList[i].slug
                        }

                        //trun off push if enabled
                        await admin.database().ref("Events").child("blogposts").update({
                            Push: false
                        })

                    }
                
                }).catch(err => {
                    console.log("The issue is in Blogposts Events ", err)
                })
            }
        })
    }
    setInterval(BlogpostsEvents, 1 * 20000)
}

const news = async () => {
    
    //result
    var responseBR = []
    var activeResBR = []
    var numberBR = 0

    //result
    var responseSTW = []
    var activeResSTW = []
    var numberSTW = 0

    //handle the news
    const BRNewsEvents = async () => {

        //checking if the bot on or off
        admin.database().ref("Events").child("news").once('value', async function (data) {
            const status = data.val().BR.Active
            const lang = data.val().BR.Lang
            const push = data.val().BR.Push.Status
            const pushIndex = data.val().BR.Push.Index

            //if the event is set to be true [ON]
            if(status){

                //request data
                axios.get(`https://fn-api.com/api/news/br?lang=${lang}`)
                .then(async res => {

                    //storing the first start up
                    if(numberBR === 0){

                        //storing news
                        for(let i = 0; i < res.data.data.news.length; i++){
                            responseBR[i] = res.data.data.news[i].id
                        }

                        //stop from storing again
                        numberBR++
                    }

                    //storing active news
                    for(let i = 0; i < res.data.data.news.length; i++){
                        activeResBR[i] = res.data.data.news[i].id
                    }

                    //if push is enabled
                    if(push) responseBR[pushIndex] = ""

                    //if the data was modified 
                    if(JSON.stringify(activeResBR) !== JSON.stringify(responseBR)){

                        //find the new news
                        for(let i = 0; i < activeResBR.length; i++){
                            if(!responseBR.includes(activeResBR[i])){

                                //post the news to twitter
                                const description = `- ${res.data.data.news[i].title} #فورتنايت\n\n• ${res.data.data.news[i].body}`

                                //
                                //  tweet the blogpost
                                //
                                T.post('media/upload', { media_data: await getBase64(res.data.data.news[i].image) }, function(err, data, response) {
                                    if(err) console.log(err)
                                    else{
                                        var mediaIdStr = data.media_id_string
                                    
                                        T.post('statuses/update', { status: description, media_ids: [mediaIdStr]}, function(err, data, response) {
                                            if(err) console.log(err)
                                        })
                                    }
                                })

                            }
                        }

                        //restoring news
                        for(let i = 0; i < res.data.data.news.length; i++){
                            responseBR[i] = res.data.data.news[i].id
                        }

                        //trun off push if enabled
                        await admin.database().ref("Events").child("news").child("BR").child("Push").update({
                            Status: false
                        })
                    }

                }).catch(err => {
                    console.log("The issue is in BRNewsEvents Events ", err)
                })
            }
        })
    }

    //handle the news
    const STWNewsEvents = async () => {

        //checking if the bot on or off
        admin.database().ref("Events").child("news").once('value', async function (data) {
            const status = data.val().STW.Active
            const lang = data.val().STW.Lang
            const push = data.val().STW.Push.Status
            const pushIndex = data.val().STW.Push.Index

            //if the event is set to be true [ON]
            if(status){

                //request data
                axios.get(`https://fn-api.com/api/news/stw?lang=${lang}`)
                .then(async res => {

                    //storing the first start up
                    if(numberSTW === 0){

                        //storing news
                        for(let i = 0; i < res.data.data.news.length; i++){
                            responseSTW[i] = res.data.data.news[i].title
                        }

                        //stop from storing again
                        numberSTW++
                    }

                    //storing active news
                    for(let i = 0; i < res.data.data.news.length; i++){
                        activeResSTW[i] = res.data.data.news[i].title
                    }

                    //if push is enabled
                    if(push) responseSTW[pushIndex] = ""

                    //if the data was modified 
                    if(JSON.stringify(activeResSTW) !== JSON.stringify(responseSTW)){

                        //find the new news
                        for(let i = 0; i < activeResSTW.length; i++){
                            if(!responseSTW.includes(activeResSTW[i])){

                                //post the news to twitter
                                const description = `- ${res.data.data.news[i].title} #فورتنايت\n\n• ${res.data.data.news[i].body}`

                                //
                                //  tweet the blogpost
                                //
                                T.post('media/upload', { media_data: await getBase64(res.data.data.news[i].image) }, function(err, data, response) {
                                    if(err) console.log(err)
                                    else{
                                        var mediaIdStr = data.media_id_string
                                    
                                        T.post('statuses/update', { status: description, media_ids: [mediaIdStr]}, function(err, data, response) {
                                            if(err) console.log(err)
                                        })
                                    }
                                })

                            }
                        }

                        //restoring news
                        for(let i = 0; i < res.data.data.news.length; i++){
                            responseSTW[i] = res.data.data.news[i].title
                        }

                        //trun off push if enabled
                        await admin.database().ref("Events").child("news").child("STW").child("Push").update({
                            Status: false
                        })
                    }

                }).catch(err => {
                    console.log("The issue is in BRNewsEvents Events ", err)
                })
            }
        })
    }

    setInterval(BRNewsEvents, 1 * 40000)
    setInterval(STWNewsEvents, 1 * 20000)
}

const Servers = async () => {

    //result
    var response = []
    var number = 0

    const ServersEvents = async () => {

        //checking if the bot on or off
        admin.database().ref("Events").child("servers").once('value', async function (data) {
            const status = data.val().Active
            const lang = data.val().Lang
            const push = data.val().Push

            //if the event is set to be true [ON]
            if(status){

                //request the token
                const token = await axios.get('https://fnbrmenaapi.herokuapp.com/api/auth?authType=exchange')

                //request data
                await axios.get('http://lightswitch-public-service-prod.ol.epicgames.com/lightswitch/api/service/fortnite/status',
                {headers: {'Content-Type': 'application/json','Authorization': `Bearer ${token.data.data.token.access_token}`}})
                .then(async res => {

                    if(number === 0){

                        //store data
                        response = await res.data.status
                        number++
                    }

                    //push
                    if(push) response = []

                    //check data
                    if(res.data.status !== response){

                        if(res.data.status.toLowerCase() === "up"){
                            var serversStatus = '- فتحت السيرفرات أستمتعوا #فورتنايت ❤️'
                            var url = 'https://imgur.com/Q6TA03N.png'

                            //
                            //  tweet the blogpost
                            //
                            T.post('media/upload', { media_data: await getBase64(url) }, function(err, data, response) {
                                if(err) console.log(err)
                                else{
                                    var mediaIdStr = data.media_id_string
                                
                                    T.post('statuses/update', { status: serversStatus, media_ids: [mediaIdStr]}, function(err, data, response) {
                                        if(err) console.log(err)
                                    })
                                }
                            })
                        }
                        else if(res.data.status.toLowerCase() === "down"){
                            var serversStatus = '- تم اغلاق السيرفرات... #فورتنايت 🛠️'
                            var url = 'https://imgur.com/glFsVFf.png'

                            //
                            //  tweet the blogpost
                            //
                            T.post('media/upload', { media_data: await getBase64(url) }, function(err, data, response) {
                                if(err) console.log(err)
                                else{
                                    var mediaIdStr = data.media_id_string
                                
                                    T.post('statuses/update', { status: serversStatus, media_ids: [mediaIdStr]}, function(err, data, response) {
                                        if(err) console.log(err)
                                    })
                                }
                            })
                        }

                        //trun off push if enabled
                        admin.database().ref("Events").child("servers").update({
                            Push: false
                        })

                        //store data
                        response = await res.data.status
                       
                    }
                }).catch(err => {
                    console.log("The issue is in Servers Events ", err)
                })
            }
        })
    }
    setInterval(ServersEvents, 1 * 20000)
}

const Itemshop = async () => {
    
    //result
    var response = []
    var shop = []
    var lastUpdate = []
    var number = 0

    const ItemshopEvents = async () => {

        //checking if the bot on or off
        admin.database().ref("Events").child("itemshop").once('value', async function (data) {
            const status = data.val().Active;
            const lang = data.val().Lang;
            const push = data.val().Push

            //if the event is set to be true [ON]
            if(status){
                
                axios.get(`https://fortniteapi.io/v2/shop?lang=${lang}`, { headers: {'Content-Type': 'application/json','Authorization': '6d960a51-50460ffb-00881638-e0d139e2'} })
                .then(async res => {
                    if(number === 0){
                        for(let i = 0; i < res.data.shop.length; i++){
                            response[i] = await res.data.shop[i].mainId
                        }
                        lastUpdate = await res.data.lastUpdate
                        number++
                    }

                    //if the client wants to pust data
                    if(push){
                        response = []
                        lastUpdate = []
                    }

                    if(JSON.stringify(res.data.lastUpdate) !== JSON.stringify(lastUpdate)){
                        for(let i = 0; i < res.data.shop.length; i++){
                            shop[i] = await res.data.shop[i].mainId
                        }

                        if(JSON.stringify(shop) !== JSON.stringify(response)){

                            //creating array of objects
                            var Featured = []
                            var Daily = []
                            var SpecialFeatured = []
                            var LimitedTime = []

                            //creating each array index
                            var FeaturedIndex = 0
                            var DailyIndex = 0
                            var SpecialFeaturedIndex = 0
                            var LimitedTimeIndex = 0

                            //storing items into there arrays
                            for(let i = 0; i < res.data.shop.length; i++){

                                //if its an a Featured item
                                if(res.data.shop[i].section.id === "Featured" || res.data.shop[i].section.id === "Featured2" || res.data.shop[i].section.id === "Featured3"){
                                    Featured[FeaturedIndex] = res.data.shop[i]
                                    //changing its index
                                    FeaturedIndex++
                                }else
                                
                                //if its an a Daily item
                                if(res.data.shop[i].section.id === "Daily"){
                                    Daily[DailyIndex] = res.data.shop[i]
                                    DailyIndex++
                                }else
                                
                                //if its an a LimitedTime item
                                if(res.data.shop[i].section.id === "LimitedTime"){
                                    LimitedTime[LimitedTimeIndex] = res.data.shop[i]
                                    LimitedTimeIndex++
                                }else

                                //if its other items then store it here 
                                {
                                    SpecialFeatured[SpecialFeaturedIndex] = res.data.shop[i]
                                    SpecialFeaturedIndex++
                                }
                            }
                            
                            //canvas stuff
                            var FeaturedSection = 0
                            var SpecialFeaturedSection = 0
                            var LengthSection
                            var Division = 0
                            var width = 0
                            var height = 250
                            var Lines = 0
                            var x = 125;
                            var y = 125;

                            //checing if there is Special items
                            if(SpecialFeatured.length !== 0){
                                //there is Special items lets check who is bigget (=
                                if(Featured.length >= SpecialFeatured.length){
                                    //Featured is bigger than SpecialFeatured
                                    LengthSection = Featured.length
                                    //checking if we will devide this from 3 or 5
                                    if(Featured.length >= 1 && Featured.length <= 12){
                                        FeaturedSection = 3
                                        SpecialFeaturedSection = 3
                                        Division = 3

                                        //creating width
                                        width = (9 * 256) + (12 * 9) + 500;

                                        //creating height
                                        for(let i = 0; i<=LengthSection; i++){
                                            Lines++;
                                            if(Division === Lines){
                                                height += 256 + 12;
                                                Lines = 0;
                                            }
                                        }

                                    } else if(Featured.length > 12){
                                        FeaturedSection = 5
                                        SpecialFeaturedSection = 3
                                        
                                        //see what the division will be
                                        if((Featured.length / FeaturedSection) > (SpecialFeatured.length / SpecialFeaturedSection)){
                                            Division = 5
                                        }else{
                                            Division = 3
                                        }

                                        //creating width
                                        width = (12*256) + (12 * 12) + 250;

                                        //creating height
                                        for(let i = 0; i<LengthSection; i++){
                                            Lines++;
                                            if(Division === Lines){
                                                height += 256 + 12;
                                                Lines = 0;
                                            }
                                        }
                                    }
                                } else if(Featured.length <= SpecialFeatured.length){
                                    LengthSection = SpecialFeatured.length
                                    if(SpecialFeatured.length >= 1 && SpecialFeatured.length <= 12){
                                        FeaturedSection = 3
                                        SpecialFeaturedSection = 3
                                        Division = 3

                                        //creating width
                                        width = (9 * 256) + (12 * 9) + 500;

                                        //creating height
                                        for(let i = 0; i<=LengthSection; i++){
                                            Lines++;
                                            if(Division === Lines){
                                                height += 256 + 12;
                                                Lines = 0;
                                            }
                                        }
                                    } else if(SpecialFeatured.length > 12){
                                        FeaturedSection = 3
                                        SpecialFeaturedSection = 5
                                        
                                        //see what the division will be
                                        if((Featured.length / FeaturedSection) > (SpecialFeatured.length / SpecialFeaturedSection)){
                                            Division = 3
                                        }else{
                                            Division = 5
                                        }

                                        //creating width
                                        width = (12 * 256) + (12 * 12) + 250;
                                        
                                        //creating height
                                        for(let i = 0; i < LengthSection; i++){
                                            Lines++;
                                            if(Division === Lines){
                                                height += 256 + 12;
                                                Lines = 0;
                                            }
                                        }
                                    }
                                }
                            } else if(Featured.length >= 1 && Featured.length <= 12){
                                LengthSection = Featured.length
                                FeaturedSection = 3;
                                SpecialFeaturedSection = 1;
                                Division = 3

                                //creating width
                                width = (6 * 256) + (12 * 6) + 375;

                                //creating height
                                for(let i = 0; i <= LengthSection; i++){
                                    Lines++;
                                    if(Division === Lines){
                                        height += 256 + 12;
                                        Lines = 0;
                                    }
                                }
                            } else if(Featured.length > 12){
                                LengthSection = Featured.length
                                FeaturedSection = 5;
                                SpecialFeaturedSection = 1;
                                Division = 5

                                //creating width
                                width = (8 * 256) + (12 * 8) + 375;

                                //creating height
                                for(let i = 0; i < LengthSection; i++){
                                    Lines++;
                                    if(Division === Lines){
                                        height += 256 + 12;
                                        Lines = 0;
                                    }
                                }
                            }
                            //changing the value of the lines to 0
                            Lines = 0;
                            if(LimitedTime.length !== 0){
                                if(lang === "en"){
                                    if(Featured.length % FeaturedSection === 0){
                                        height += 637
                                        for(let i = 0; i < LimitedTime.length; i++){
                                            if(3 === Lines){
                                                height += 512 + 25;
                                                Lines = 0;
                                            }
                                            Lines++;
                                        }
                                    }else{
                                        height += 700
                                        for(let i = 0; i < LimitedTime.length; i++){
                                            if(3 === Lines){
                                                height += 512 + 25;
                                                Lines = 0;
                                            }
                                            Lines++;
                                        }
                                    } 
                                } else if(lang === "ar"){
                                    if(SpecialFeatured.length !== 0){
                                        if(SpecialFeatured.length % SpecialFeaturedSection === 0){
                                            height += 637
                                            for(let i = 0; i < LimitedTime.length; i++){
                                                if(3 === Lines){
                                                    height += 512 + 25;
                                                    Lines = 0;
                                                }
                                                Lines++;
                                            }
                                        }else{
                                            height += 762
                                            for(let i = 0; i < LimitedTime.length; i++){
                                                if(3 === Lines){
                                                    height += 512 + 25;
                                                    Lines = 0;
                                                }
                                                Lines++;
                                            }
                                        }
                                    } else if(res.data.daily.length % 3 === 0){
                                        height += 762
                                        for(let i = 0; i < LimitedTime.length; i++){
                                            if(3 === Lines){
                                                height += 512 + 25;
                                                Lines = 0;
                                            }
                                            Lines++;
                                        }
                                    }else{
                                        height += 762
                                        for(let i = 0; i < LimitedTime.length; i++){
                                            if(3 === Lines){
                                                height += 512 + 25;
                                                Lines = 0;
                                            }
                                            Lines++;
                                        }
                                    }
                                }
                            }else{
                                height += 150
                            }
                            height += 200

                            //applyText
                            const applyText = (canvas, text, type) => {
                                const ctx = canvas.getContext('2d');
                                if(JSON.stringify(type) === JSON.stringify(LimitedTime)){
                                    let fontSize = 75;
                                    do {
                                        if(lang === "en")ctx.font = `${fontSize -= 1}px Burbank Big Condensed`;
                                        else if(lang === "ar")ctx.font = `${fontSize -= 1}px Arabic`;
                                    } while (ctx.measureText(text).width > 400);
                                }else{
                                    let fontSize = 30;
                                    do {
                                        if(lang === "en")ctx.font = `${fontSize -= 1}px Burbank Big Condensed`;
                                        else if(lang === "ar")ctx.font = `${fontSize -= 1}px Arabic`;
                                    } while (ctx.measureText(text).width > 210);
                                }
                                return ctx.font;
                            };

                            //Register fonts
                            Canvas.registerFont('./assets/font/Lalezar-Regular.ttf', {family: 'Arabic',weight: "700",style: "bold"});
                            Canvas.registerFont('./assets/font/BurbankBigCondensed-Black.otf' ,{family: 'Burbank Big Condensed',weight: "700",style: "bold"})

                            //creating canvas
                            const canvas = Canvas.createCanvas(width, height);
                            const ctx = canvas.getContext('2d');

                            //background
                            const background = await Canvas.loadImage('./assets/Shop/background.png')
                            ctx.drawImage(background, 0, 0, canvas.width, canvas.height)

                            //code
                            if(lang === "en"){
                                const code = await Canvas.loadImage('./assets/Credits/code.png')
                                ctx.drawImage(code, 50, (height - 150), 500, 100)
                            }else if(lang === "ar"){
                                const code = await Canvas.loadImage('./assets/Credits/codeAR.png')
                                ctx.drawImage(code, (canvas.width - 550), (height - 150), 500, 100)
                            }

                            //date
                            var date
                            if(lang === "en"){
                                moment.locale("en")
                                date = moment(res.data.lastUpdate.date).format("dddd, MMMM Do of YYYY")
                                ctx.fillStyle = '#ffffff';
                                ctx.textAlign='center';
                                ctx.font = `100px Burbank Big Condensed`
                                ctx.fillText(date, (width / 2), (height - 50))
                            }else if(lang === "ar"){
                                moment.locale("ar")
                                date = moment(res.data.lastUpdate.date).format("dddd, MMMM Do من YYYY")
                                ctx.fillStyle = '#ffffff';
                                ctx.textAlign='center';
                                ctx.font = `100px Arabic`
                                ctx.fillText(date, (width / 2), (height - 50))
                            }

                            //display items method
                            const DisplayShop = async (ctx, canvas, x, y, i, type, WidthC, HeightC
                                ,NameX, NameY, PriceX, PriceY, DayX, DayY, vBucksX, vBucksY, vBucksW
                                ,vBucksH, CreditX, CreditY, CreditW, CreditH, textSize, BannerW, BannerH) => {

                                //skin informations
                                var name = type[i].displayName
                                var price = type[i].price.finalPrice
                                if(type[i].displayAssets.length !== 0) var image = type[i].displayAssets[0].url
                                else var image = type[i].granted[0].images.icon
                                if(type[i].series === null) var rarity = type[i].rarity.id
                                else  var rarity = type[i].series.id
                                var newItem = false
                                if(type[i].banner !== null){
                                    if(type[i].banner.id === "New") newItem = true
                                }
                                var vbucks = "https://media.fortniteapi.io/images/652b99f7863db4ba398c40c326ac15a9/transparent.png";

                                //moment
                                var Now = moment()
                                if(type[i].previousReleaseDate !== null) var last = moment(type[i].previousReleaseDate);
                                else var last = moment(type[i].firstReleaseDate)
                                const day = Now.diff(last, 'days');

                                if(rarity === 'Legendary'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/legendary.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderLegendary.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'Epic'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/epic.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderEpic.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'Rare'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/rare.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderRare.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'Uncommon'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/uncommon.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderUncommon.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'Common'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/common.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderCommon.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'MarvelSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/marvel.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderMarvel.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'DCUSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/dc.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderDc.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'CUBESeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/dark.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderDark.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'CreatorCollabSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/icon.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderIcon.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'ColumbusSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/starwars.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderStarwars.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'ShadowSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/shadow.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderShadow.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'SlurpSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/slurp.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderSlurp.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }  
                                }else
                                if(rarity === 'FrozenSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/frozen.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderFrozen.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else
                                if(rarity === 'LavaSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/lava.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderLava.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }                            
                                }else
                                if(rarity === 'PlatformSeries'){
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/gaming.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderGaming.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }else{
                                    //creating image
                                    const skinholder = await Canvas.loadImage('./assets/Rarities/standard/common.png')
                                    ctx.drawImage(skinholder, x, y, WidthC, HeightC)
                                    const skin = await Canvas.loadImage(image);
                                    ctx.drawImage(skin, x, y, WidthC, HeightC)
                                    const skinborder = await Canvas.loadImage('./assets/Rarities/standard/borderCommon.png')
                                    ctx.drawImage(skinborder, x, y, WidthC, HeightC)
                                    if(lang === "en"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/new.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 37))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Burbank Big Condensed`
                                        ctx.fillText(day + " Days", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }else if(lang === "ar"){
                                        if(newItem === true){
                                            const newItem = await Canvas.loadImage('./assets/Shop/newAR.png')
                                            ctx.drawImage(newItem, x - 10, y - 15, BannerW, BannerH)
                                        }
                                        ctx.fillStyle = '#ffffff';
                                        ctx.textAlign='center';
                                        ctx.font = applyText(canvas, name, type);
                                        if(JSON.stringify(type) === JSON.stringify(LimitedTime)) ctx.fillText(name, (NameX + x), (y + NameY - 30))
                                        else ctx.fillText(name, (NameX + x), (y + NameY))
                                        ctx.textAlign='left';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(price, (PriceX + x), (y + PriceY))
                                        ctx.textAlign='right';
                                        ctx.font = `${textSize}px Arabic`
                                        ctx.fillText(day + " يوم", (DayX + x), (y + DayY))
                                        ctx.textAlign='left';
                                        const v = await Canvas.loadImage(vbucks);
                                        ctx.drawImage(v, (vBucksX + x), (y + vBucksY), vBucksW, vBucksH);
                                    }
                                }
                                return canvas, ctx
                            }

                            //sending data to DisplayShop function
                            Lines = 0

                            //Featured
                            if(lang === "en"){
                                ctx.fillStyle = '#ffffff';
                                ctx.textAlign='left';
                                ctx.font = '75px Burbank Big Condensed'
                                ctx.fillText("Featured", x, (y - 25))
                            }else if(lang === "ar"){
                                if(FeaturedSection === 3){
                                    ctx.fillStyle = '#ffffff';
                                    ctx.textAlign='right';
                                    ctx.font = '75px Arabic'
                                    ctx.fillText("مميز", x + 793, (y - 25))
                                }else if(FeaturedSection === 5){
                                    ctx.fillStyle = '#ffffff';
                                    ctx.textAlign='right';
                                    ctx.font = '75px Arabic'
                                    ctx.fillText("مميز", x + 1330, (y - 25))
                                }
                            }

                            //Featured Loop
                            for(let i = 0; i < Featured.length; i++){

                                //changing the lines
                                Lines++

                                //width and height
                                var WidthC = 256
                                var HeightC = 256
                                var NameX = 125
                                var NameY = 215
                                var PriceX = 37
                                var PriceY = 245
                                var DayX = 243
                                var DayY = 245
                                var vBucksX = 10
                                var vBucksY = 225
                                var vBucksW = 25
                                var vBucksH = 25
                                var CreditX = 7
                                var CreditY = 7
                                var CreditW = 37
                                var CreditH = 20
                                var textSize = 18
                                var BannerW = 55
                                var BannerH = 33

                                //calling the function
                                await DisplayShop(ctx, canvas, x, y, i, Featured, WidthC, HeightC
                                    ,NameX, NameY, PriceX, PriceY, DayX, DayY, vBucksX, vBucksY, vBucksW
                                    ,vBucksH, CreditX, CreditY, CreditW, CreditH, textSize, BannerW, BannerH)

                                // changing x and y
                                x = x + 12 + 256; 
                                if (FeaturedSection === Lines){
                                    y = y + 12 + 256;
                                    x = 125;
                                    Lines = 0;
                                }
                            }
                            
                            //switching from Featured to Daily
                            Lines = 0
                            if(FeaturedSection == 3){
                                x = 1043;
                                y = 125;
                            }else if(FeaturedSection === 5){
                                x = 1592;
                                y = 125;
                            }

                            //Daily

                            if(lang === "en"){
                                ctx.fillStyle = '#ffffff';
                                ctx.font = '75px Burbank Big Condensed'
                                ctx.fillText("Daily", x, (y - 25))
                            }else if(lang === "ar"){
                                ctx.fillStyle = '#ffffff';
                                ctx.textAlign='right';
                                ctx.font = '75px Arabic'
                                ctx.fillText("يومي", x + 793, (y - 30))
                            }
                            //Daile Loop
                            for(let i = 0; i < Daily.length; i++){
                                //changing the lines
                                Lines++

                                //width and height
                                var WidthC = 256
                                var HeightC = 256
                                var NameX = 125
                                var NameY = 215
                                var PriceX = 37
                                var PriceY = 245
                                var DayX = 243
                                var DayY = 245
                                var vBucksX = 10
                                var vBucksY = 225
                                var vBucksW = 25
                                var vBucksH = 25
                                var CreditX = 7
                                var CreditY = 7
                                var CreditW = 37
                                var CreditH = 20
                                var textSize = 18
                                var BannerW = 55
                                var BannerH = 33

                                //calling the function
                                await DisplayShop(ctx, canvas, x, y, i, Daily, WidthC, HeightC
                                    ,NameX, NameY, PriceX, PriceY, DayX, DayY, vBucksX, vBucksY, vBucksW
                                    ,vBucksH, CreditX, CreditY, CreditW, CreditH, textSize, BannerW, BannerH)

                                // changing x and y
                                x = x + 12 + 256; 
                                if (3 === Lines){
                                    y = y + 12 + 256;
                                    Lines = 0
                                    if(FeaturedSection == 3){
                                        x = 1043;
                                    }else if(FeaturedSection === 5){
                                        x = 1592;
                                    }
                                }
                            }

                            //Switching from Daily to SpecialFeatured
                            Lines = 0
                            if (SpecialFeaturedSection == 5){
                                x = 1873 + 125;
                                y = 125;  
                            }else if (SpecialFeaturedSection == 3){
                                if(FeaturedSection === 5){
                                    x = 2523;
                                    y = 125;
                                }else if (FeaturedSection === 3){
                                    x = 1961;
                                    y = 125;
                                }
                            }

                            //SpecialFeatured
                            if(lang === "en"){
                                ctx.fillStyle = '#ffffff';
                                ctx.font = '75px Burbank Big Condensed'
                                ctx.fillText("Special Featured", x, (y - 25))
                            }else if(lang === "ar"){
                                if(SpecialFeaturedSection === 3){
                                    ctx.fillStyle = '#ffffff';
                                    ctx.textAlign='right';
                                    ctx.font = '75px Arabic'
                                    ctx.fillText("عروض مميزة", x + 793, (y - 30))
                                }else if(SpecialFeaturedSection === 5){
                                    ctx.fillStyle = '#ffffff';
                                    ctx.textAlign='right';
                                    ctx.font = '75px Arabic'
                                    ctx.fillText("عروض مميزه", x + 1330, (y - 30))
                                }
                            }
                        
                            //SpecialFeatured Loop
                            for(let i = 0; i < SpecialFeatured.length; i++){
                                //changing the lines
                                Lines++

                                //width and height
                                var WidthC = 256
                                var HeightC = 256
                                var NameX = 125
                                var NameY = 215
                                var PriceX = 37
                                var PriceY = 245
                                var DayX = 243
                                var DayY = 245
                                var vBucksX = 10
                                var vBucksY = 225
                                var vBucksW = 25
                                var vBucksH = 25
                                var CreditX = 7
                                var CreditY = 7
                                var CreditW = 37
                                var CreditH = 20
                                var textSize = 18
                                var BannerW = 55
                                var BannerH = 33

                                //calling the function
                                await DisplayShop(ctx, canvas, x, y, i, SpecialFeatured, WidthC, HeightC
                                    ,NameX, NameY, PriceX, PriceY, DayX, DayY, vBucksX, vBucksY, vBucksW
                                    ,vBucksH, CreditX, CreditY, CreditW, CreditH, textSize, BannerW, BannerH)

                                // changing x and y
                                x = x + 12 + 256; 
                                if(SpecialFeaturedSection === Lines){
                                    y = y + 12 + 256;
                                    Lines = 0
                                    if(SpecialFeaturedSection == 5){
                                        x = 1873 + 125;                  
                                    }else if (SpecialFeaturedSection == 3){
                                        if(FeaturedSection === 5){
                                            x = 2523;
                                        }else if (FeaturedSection === 3){
                                            x = 1961;
                                        }
                                    }
                                }
                            }

                            //Limited Time
                            Lines = 0
                            if(lang === "en"){
                                x = 256
                                y = canvas.height - (150 + 75 + 512)
                                for(let i = 0; i< LimitedTime.length; i++){
                                    if(Lines === 3){
                                        y -= 512 + 25
                                    }
                                    Lines++
                                }
                            }else if(lang == "ar"){
                                x = canvas.width - (125 + 512 + 12)
                                y = canvas.height - (150 + 75 + 512)
                                for(let i = 0; i< LimitedTime.length; i++){
                                    if(Lines === 3){
                                        y -= 512 + 25
                                    }
                                    Lines++
                                }
                            }

                            if(LimitedTime.length !== 0){
                                if(lang === "en"){
                                    ctx.fillStyle = '#ffffff';
                                    ctx.font = '75px Burbank Big Condensed'
                                    ctx.fillText("Bundles", x, (y - 27))
                                }else if(lang === "ar"){
                                    ctx.fillStyle = '#ffffff';
                                    ctx.textAlign='right';
                                    ctx.font = '75px Arabic'
                                    ctx.fillText("الحزم", x + 512, (y - 27))
                                }
                            }

                            //Limited Time Loop
                            Lines = 0
                            for(let i = 0; i < LimitedTime.length; i++){
                                //changing the lines
                                Lines++

                                //width and height
                                var WidthC = 512
                                var HeightC = 512
                                var NameX = 256
                                var NameY = 471
                                var PriceX = 52
                                var PriceY = 493
                                var DayX = 491
                                var DayY = 493
                                var vBucksX = 12
                                var vBucksY = 460
                                var vBucksW = 40
                                var vBucksH = 40
                                var CreditX = 15
                                var CreditY = 15
                                var CreditW = 146
                                var CreditH = 40
                                var textSize = 40

                                //calling the function
                                await DisplayShop(ctx, canvas, x, y, i, LimitedTime, WidthC, HeightC
                                    ,NameX, NameY, PriceX, PriceY, DayX, DayY, vBucksX, vBucksY, vBucksW
                                    ,vBucksH, CreditX, CreditY, CreditW, CreditH, textSize, BannerW, BannerH)

                                // changing x and y
                                if(lang === "en"){
                                    x = x + 12 + 512;
                                }else if(lang === "ar"){
                                    x = x - (12 + 512);
                                }
                                if (Lines === 3){
                                    if(lang === "en"){
                                        y = y + 12 + 512;
                                        Lines = 0
                                        x = 125
                                    }else if(lang === "ar"){
                                        y = y + 12 + 512;
                                        Lines = 0
                                        x = canvas.width - (125 + 512 + 12)
                                    }
                                }
                            }

                            //
                            //  tweet the blogpost
                            //
                            const buffer = canvas.toBuffer('image/png')
                            await T.post('media/upload', { media_data: Buffer.from(buffer, 'binary').toString('base64') }, async function(err, data, response) {
                                if(err) console.log(err)
                                else{
                                    var mediaIdStr = await data.media_id_string
                                
                                    await T.post('statuses/update', { status: '- الشوب #فورتنايت', media_ids: [mediaIdStr]}, async function(err, data, response) {
                                        if(err) console.log(err)
                                    })
                                }
                            })

                            for(let i = 0; i < res.data.shop.length; i++){
                                response[i] = await res.data.shop[i].mainId
                            }
                            lastUpdate = await res.data.lastUpdate

                            //trun off push if enabled
                            admin.database().ref("Events").child("itemshop").update({
                                Push: false
                            })
                        }
                    }
                }).catch(err => {
                    console.log("The issue is in Itemshop Events ", err)
                })
            }
        })
    }
    setInterval(ItemshopEvents, 1.5 * 40000)
}

//activate events
Blogposts()
//Itemshop()
Servers()
news()