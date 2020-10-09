import { newDefaultScheduler } from "@most/scheduler";
import { runAt } from "fufu";
import { $bodyRoot } from "./common/common";
import $TodoApp from "./todo-app/$TodoApp";


runAt(
    $bodyRoot(
        $TodoApp({})
    ),
    newDefaultScheduler()
)
