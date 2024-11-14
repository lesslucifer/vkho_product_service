export const parseDate = (d: Date) => {
    console.log(d.getTimezoneOffset())
    return new Date(d.setTime( d.getTime() - d.getTimezoneOffset()*60*1000 ));
}