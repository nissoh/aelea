import { continueWith, empty } from "@most/core";
import { disposeWith } from "@most/disposable";
import { Stream } from "@most/types";

export const debugStreamEnd = continueWith(() => {
    // tslint:disable-next-line: no-debugger
    debugger
    return empty()
})

export const debugStreamDisposale = <T>(s: Stream<T>): Stream<T> => ({
    run: (sink, sch) => {
        const disp = s.run({
            event: (t, x) => sink.event(t, x),
            end: (t) => {
                // tslint:disable-next-line: no-debugger
                debugger
                sink.end(t)
            },
            error: (t, err) => sink.error(t, err)
        }, sch);

        return disposeWith(() => {
            // tslint:disable-next-line: no-debugger
            debugger
            disp.dispose()
        }, null)
    }
})
