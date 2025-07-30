/**
 * Pipe operator for functional composition.
 * Manually unrolled for performance optimization up to 20 arguments.
 * Falls back to loop for more than 20 arguments.
 */

export const op: Op = (a: any, ...args: readonly any[]) => {
  switch (args.length) {
    case 0:
      return a
    case 1:
      return args[0](a)
    case 2:
      return args[1](args[0](a))
    case 3:
      return args[2](args[1](args[0](a)))
    case 4:
      return args[3](args[2](args[1](args[0](a))))
    case 5:
      return args[4](args[3](args[2](args[1](args[0](a)))))
    case 6:
      return args[5](args[4](args[3](args[2](args[1](args[0](a))))))
    case 7:
      return args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))
    case 8:
      return args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a))))))))
    case 9:
      return args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))
    case 10:
      return args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a))))))))))
    case 11:
      return args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))))
    case 12:
      return args[11](
        args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))))
      )
    case 13:
      return args[12](
        args[11](args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a))))))))))))
      )
    case 14:
      return args[13](
        args[12](
          args[11](
            args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))))
          )
        )
      )
    case 15:
      return args[14](
        args[13](
          args[12](
            args[11](
              args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))))
            )
          )
        )
      )
    case 16:
      return args[15](
        args[14](
          args[13](
            args[12](
              args[11](
                args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))))
              )
            )
          )
        )
      )
    case 17:
      return args[16](
        args[15](
          args[14](
            args[13](
              args[12](
                args[11](
                  args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))))
                )
              )
            )
          )
        )
      )
    case 18:
      return args[17](
        args[16](
          args[15](
            args[14](
              args[13](
                args[12](
                  args[11](
                    args[10](
                      args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a))))))))))
                    )
                  )
                )
              )
            )
          )
        )
      )
    case 19:
      return args[18](
        args[17](
          args[16](
            args[15](
              args[14](
                args[13](
                  args[12](
                    args[11](
                      args[10](
                        args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a))))))))))
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    case 20:
      return args[19](
        args[18](
          args[17](
            args[16](
              args[15](
                args[14](
                  args[13](
                    args[12](
                      args[11](
                        args[10](
                          args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a))))))))))
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    default: {
      let ret = a
      for (let i = 0; i < args.length; i++) ret = args[i](ret)
      return ret
    }
  }
}

export interface Op {
  <A>(a: A): A
  <A, B>(a: A, ab: (_: A) => B): B
  <A, B, C>(a: A, ab: (_: A) => B, bc: (_: B) => C): C
  <A, B, C, D>(a: A, ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D): D
  <A, B, C, D, E>(a: A, ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D, de: (_: D) => E): E
  <A, B, C, D, E, F>(a: A, ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D, de: (_: D) => E, ef: (_: E) => F): F
  <A, B, C, D, E, F, G>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G
  ): G
  <A, B, C, D, E, F, G, H>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H
  ): H
  <A, B, C, D, E, F, G, H, I>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I
  ): I
  <A, B, C, D, E, F, G, H, I, J>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J
  ): J
  <A, B, C, D, E, F, G, H, I, J, K>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K
  ): K
  <A, B, C, D, E, F, G, H, I, J, K, L>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L
  ): L
  <A, B, C, D, E, F, G, H, I, J, K, L, M>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M
  ): M
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M,
    mn: (_: M) => N
  ): N
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M,
    mn: (_: M) => N,
    no: (_: N) => O
  ): O
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M,
    mn: (_: M) => N,
    no: (_: N) => O,
    op: (_: O) => P
  ): P
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M,
    mn: (_: M) => N,
    no: (_: N) => O,
    op: (_: O) => P,
    pq: (_: P) => Q
  ): Q
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M,
    mn: (_: M) => N,
    no: (_: N) => O,
    op: (_: O) => P,
    pq: (_: P) => Q,
    qr: (_: Q) => R
  ): R
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M,
    mn: (_: M) => N,
    no: (_: N) => O,
    op: (_: O) => P,
    pq: (_: P) => Q,
    qr: (_: Q) => R,
    rs: (_: R) => S
  ): S
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M,
    mn: (_: M) => N,
    no: (_: N) => O,
    op: (_: O) => P,
    pq: (_: P) => Q,
    qr: (_: Q) => R,
    rs: (_: R) => S,
    st: (_: S) => T
  ): T
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M,
    mn: (_: M) => N,
    no: (_: N) => O,
    op: (_: O) => P,
    pq: (_: P) => Q,
    qr: (_: Q) => R,
    rs: (_: R) => S,
    st: (_: S) => T,
    tu: (_: T) => U
  ): U
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */

export const id = <A>(x: A): A => x

export const compose =
  <A, B, C>(f: (b: B) => C, g: (a: A) => B) =>
  (x: A): C =>
    f(g(x))

export const apply = <A, B>(f: (a: A) => B, x: A): B => f(x)

export interface Curried2<A, B, C> {
  (): Curried2<A, B, C>
  (a: A, b: B): C
  (a: A): (b: B) => C
}

export function curry2<A, B, C>(f: (a: A, b: B) => C): Curried2<A, B, C> {
  function curried(a: A, b: B): any {
    switch (arguments.length) {
      case 0:
        return curried
      case 1:
        return (b: B) => f(a, b)
      default:
        return f(a, b)
    }
  }
  return curried as any
}

export interface Curried3<A, B, C, D> {
  (): Curried3<A, B, C, D>
  (a: A): Curried2<B, C, D>
  (a: A, b: B): (c: C) => D
  (a: A, b: B, c: C): D
}

export function curry3<A, B, C, D>(f: (a: A, b: B, c: C) => D): Curried3<A, B, C, D> {
  function curried(a: A, b: B, c: C): any {
    switch (arguments.length) {
      case 0:
        return curried
      case 1:
        return curry2((b: B, c: C) => f(a, b, c))
      case 2:
        return (c: C) => f(a, b, c)
      default:
        return f(a, b, c)
    }
  }
  return curried as any
}

export interface Curried4<A, B, C, D, E> {
  (): Curried4<A, B, C, D, E>
  (a: A): Curried3<B, C, D, E>
  (a: A, b: B): Curried2<C, D, E>
  (a: A, b: B, c: C): (d: D) => E
  (a: A, b: B, c: C, d: D): E
}

export function curry4<A, B, C, D, E>(f: (a: A, b: B, c: C, d: D) => E): Curried4<A, B, C, D, E> {
  function curried(a: A, b: B, c: C, d: D): any {
    switch (arguments.length) {
      case 0:
        return curried
      case 1:
        return curry3((b: B, c: C, d: D) => f(a, b, c, d))
      case 2:
        return curry2((c: C, d: D) => f(a, b, c, d))
      case 3:
        return (d: D) => f(a, b, c, d)
      default:
        return f(a, b, c, d)
    }
  }
  return curried as any
}
